import json
import hashlib
import urllib.request
import urllib.error

def md5(s):
    # The JS implementation returns UPPERCASE hex
    return hashlib.md5(s.encode('utf-8')).hexdigest().upper()

url = "http://cam.lab/RPC2_Login"
username = "admin"
password = "Minhmeo75321@"

# Step 1: First Login
payload1 = {
    "method": "global.login",
    "params": {
        "userName": username,
        "password": "",
        "clientType": "Web3.0"
    },
    "id": 100
}

print(f"Sending first login request to {url}...")

def send_request(url, data, cookies=None):
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    if cookies:
        req.add_header('Cookie', cookies)
    try:
        with urllib.request.urlopen(req) as response:
            return response.read().decode('utf-8'), response.headers
    except urllib.error.HTTPError as e:
        return e.read().decode('utf-8'), e.headers

try:
    resp1_body, resp1_headers = send_request(url, payload1)
    print(f"Response 1 body: {resp1_body}")
    
    data1 = json.loads(resp1_body)
    
    random_val = None
    realm_val = None
    encryption = None
    session_id = data1.get('session')
    
    if 'params' in data1:
         random_val = data1['params'].get('random')
         realm_val = data1['params'].get('realm')
         encryption = data1['params'].get('encryption')
    
    print(f"Random: {random_val}")
    print(f"Realm: {realm_val}")
    print(f"Encryption: {encryption}")
    print(f"Session ID: {session_id}")
    
    if encryption == "Default":
        # Step 2: Calculate Hash
        # g = hex_md5(username + ":" + realm + ":" + password)
        s1 = f"{username}:{realm_val}:{password}"
        g = md5(s1)
        print(f"Hash 1 (g): {g}")
        
        # h = hex_md5(username + ":" + random + ":" + g)
        s2 = f"{username}:{random_val}:{g}"
        h = md5(s2)
        print(f"Hash 2 (h): {h}")
        
        # Step 3: Second Login
        payload2 = {
            "method": "global.login",
            "params": {
                "userName": username,
                "password": h,
                "clientType": "Web3.0",
                "authorityType": encryption,
                "passwordType": encryption
            },
            "id": 101,
            "session": session_id
        }
        
        print("Sending second login request...")
        resp2_body, resp2_headers = send_request(url, payload2)
        print(f"Response 2 body: {resp2_body}")
        
        data2 = json.loads(resp2_body)
        if 'result' in data2 and data2['result'] is True:
             print("LOGIN SUCCESSFUL!")
        else:
             print("LOGIN FAILED!")

    else:
        print(f"Unsupported encryption type: {encryption}")

except Exception as e:
    print(f"An error occurred: {e}")
