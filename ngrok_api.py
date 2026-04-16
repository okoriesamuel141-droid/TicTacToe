from pyngrok import ngrok
import time

# Set auth token
ngrok.set_auth_token("3BiGfsKmILfqKFa4Vvl7Mcw5Rwh_4DhBU9JEDPWdTV67QW8Vo")

print("🚀 Starting ngrok tunnel...")

try:
    # Create HTTP tunnel to port 5000
    tunnel = ngrok.connect(5000, "http")
    public_url = tunnel.public_url

    print("✅ ngrok tunnel created successfully!")
    print(f"🌐 Public URL: {public_url}")
    print(f"🎮 Share this URL with others to play: {public_url}")
    print("\n📋 How to play multiplayer:")
    print("1. You (Player 1): Go to Settings → Online Multiplayer → Create Room")
    print("2. Share the room code with Player 2")
    print("3. Player 2: Enter the code and click 'Join Room'")
    print("\nPress Ctrl+C to stop the tunnel")

    # Keep the tunnel alive
    while True:
        time.sleep(1)

except Exception as e:
    print(f"❌ Error creating tunnel: {e}")
    print("\n💡 Alternative methods:")
    print("1. Download ngrok from https://ngrok.com/download")
    print("2. Run: ngrok config add-authtoken YOUR_TOKEN")
    print("3. Run: ngrok http 5000")
    print("\nOr use local network access:")
    print("- Same network: http://10.105.3.224:5000")