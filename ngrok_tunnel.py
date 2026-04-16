from pyngrok import ngrok

# Set auth token
ngrok.set_auth_token('3BiGfsKmILfqKFa4Vvl7Mcw5Rwh_4DhBU9JEDPWdTV67QW8Vo')

# Create tunnel
tunnel = ngrok.connect(5000)
print(f"Public URL: {tunnel.public_url}")
print("Press Ctrl+C to stop the tunnel")

# Keep running
try:
    ngrok.get_ngrok_process().proc.wait()
except KeyboardInterrupt:
    ngrok.kill()