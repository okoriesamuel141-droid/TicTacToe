from pyngrok import ngrok
import time

# Set auth token
ngrok.set_auth_token('3BiGfsKmILfqKFa4Vvl7Mcw5Rwh_4DhBU9JEDPWdTV67QW8Vo')

# Start tunnel
print("Starting ngrok tunnel on port 5000...")
tunnel = ngrok.connect(5000)
print(f"✅ Tunnel created: {tunnel.public_url}")
print("Share this URL with others to access your game from anywhere!")
print("Press Ctrl+C to stop the tunnel")

# Keep running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Stopping tunnel...")
    ngrok.disconnect(tunnel.public_url)
    print("✅ Tunnel stopped")