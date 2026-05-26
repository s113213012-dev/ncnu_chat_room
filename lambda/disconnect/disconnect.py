import json
import logging
import os
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _broadcast(domain_name: str, stage: str, payload: dict):
    endpoint_url = f"https://{domain_name}/{stage}"
    apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)
    data = json.dumps(payload).encode("utf-8")

    connections = []
    scan_kwargs: dict = {"ProjectionExpression": "connectionId"}
    while True:
        response = table.scan(**scan_kwargs)
        connections.extend(response["Items"])
        if "LastEvaluatedKey" not in response:
            break
        scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]

    for conn in connections:
        cid = conn["connectionId"]
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=data)
        except apigw.exceptions.GoneException:
            table.delete_item(Key={"connectionId": cid})
        except Exception as e:
            logger.error("Failed to send to %s: %s", cid, e)


def handler(event, context):
    try:
        rc = event["requestContext"]
        connection_id = rc["connectionId"]
        domain_name = rc["domainName"]
        stage = rc["stage"]

        # Get callsign before deleting the record
        response = table.get_item(Key={"connectionId": connection_id})
        callsign = response.get("Item", {}).get("callsign", "unknown")

        table.delete_item(Key={"connectionId": connection_id})

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        _broadcast(
            domain_name,
            stage,
            {"type": "system", "event": "user_left", "callsign": callsign, "timestamp": now},
        )

        return {"statusCode": 200, "body": "Disconnected"}

    except Exception as e:
        logger.error("Unhandled error in disconnect: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
