import json
import logging
import os
import re
from datetime import datetime, timezone

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ["TABLE_NAME"]
CALLSIGN_RE = re.compile(r"^[a-zA-Z0-9_]{1,20}$")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def _broadcast(domain_name: str, stage: str, payload: dict, skip_id: str | None = None):
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
        if cid == skip_id:
            continue
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

        params = event.get("queryStringParameters") or {}
        callsign = params.get("callsign", "").strip()

        if not CALLSIGN_RE.match(callsign):
            return {"statusCode": 400, "body": "Invalid or missing callsign"}

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        table.put_item(
            Item={
                "connectionId": connection_id,
                "callsign": callsign,
                "connectedAt": now,
            }
        )

        # Broadcast user_joined to all OTHER connections (new user is not yet
        # fully connected when $connect fires, so skipping them avoids confusion)
        _broadcast(
            domain_name,
            stage,
            {"type": "system", "event": "user_joined", "callsign": callsign, "timestamp": now},
            skip_id=connection_id,
        )

        return {"statusCode": 200, "body": "Connected"}

    except Exception as e:
        logger.error("Unhandled error in connect: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
