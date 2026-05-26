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


def handler(event, context):
    try:
        rc = event["requestContext"]
        connection_id = rc["connectionId"]
        domain_name = rc["domainName"]
        stage = rc["stage"]

        # --- Parse and validate body ---
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return {"statusCode": 400, "body": "Missing or invalid text"}

        text = body.get("text", "")
        if not text or not isinstance(text, str) or len(text) > 1000:
            return {"statusCode": 400, "body": "Missing or invalid text"}

        # --- Look up sender's callsign ---
        response = table.get_item(Key={"connectionId": connection_id})
        sender = response.get("Item")
        if not sender:
            return {"statusCode": 400, "body": "Unknown sender"}
        callsign = sender["callsign"]

        # --- Build broadcast payload ---
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        payload = {
            "type": "message",
            "callsign": callsign,
            "text": text,
            "timestamp": now,
        }
        data = json.dumps(payload).encode("utf-8")

        # --- Scan all connections (with pagination) ---
        connections = []
        scan_kwargs: dict = {"ProjectionExpression": "connectionId"}
        while True:
            scan_response = table.scan(**scan_kwargs)
            connections.extend(scan_response["Items"])
            if "LastEvaluatedKey" not in scan_response:
                break
            scan_kwargs["ExclusiveStartKey"] = scan_response["LastEvaluatedKey"]

        # --- Fan-out ---
        endpoint_url = f"https://{domain_name}/{stage}"
        apigw = boto3.client("apigatewaymanagementapi", endpoint_url=endpoint_url)

        for conn in connections:
            cid = conn["connectionId"]
            try:
                apigw.post_to_connection(ConnectionId=cid, Data=data)
            except apigw.exceptions.GoneException:
                table.delete_item(Key={"connectionId": cid})
            except Exception as e:
                logger.error("Failed to send to %s: %s", cid, e)

        return {"statusCode": 200, "body": "Message sent"}

    except Exception as e:
        logger.error("Unhandled error in send_message: %s", e)
        return {"statusCode": 500, "body": "Internal server error"}
