import asyncio
import websockets
import json
import requests
import time

def test_ws_runner():
    # 1. Trigger a run via HTTP
    base_url = "http://localhost:8000"
    try:
        response = requests.post(f"{base_url}/run/", json={"case_ids": []})
        response.raise_for_status()
        data = response.json()
        batch_id = data["batch_id"]
        print(f"Triggered run, batch_id: {batch_id}")
    except Exception as e:
        print(f"Failed to trigger run: {e}")
        return

    # 2. Connect via WebSocket
    async def listen():
        uri = f"ws://localhost:8000/run/ws/{batch_id}"
        print(f"Connecting to {uri}...")
        try:
            async with websockets.connect(uri) as websocket:
                print("Connected! Waiting for messages...")
                while True:
                    try:
                        message = await websocket.recv()
                        data = json.loads(message)
                        print(f"Received: {data['type']}")
                        if data['type'] == 'done':
                            print("Run completed!")
                            break
                        if data['type'] == 'error':
                            print(f"Error: {data['message']}")
                            break
                    except websockets.ConnectionClosed:
                        print("Connection closed")
                        break
        except Exception as e:
            print(f"WS Connection failed: {e}")

    asyncio.run(listen())

if __name__ == "__main__":
    test_ws_runner()
