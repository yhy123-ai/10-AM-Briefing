"""Current Windows user DPAPI storage. Secrets are never printed by this CLI."""
import base64, ctypes, getpass, json, os, secrets
from ctypes import wintypes
from pathlib import Path

LOCAL = Path(__file__).resolve().parents[1] / '.local'
class Blob(ctypes.Structure):
    _fields_ = [('size', wintypes.DWORD), ('data', ctypes.POINTER(ctypes.c_char))]

def crypt(data: bytes, decrypt=False) -> bytes:
    if os.name != 'nt':
        raise RuntimeError('Credentials require this Windows user account')
    buffer = ctypes.create_string_buffer(data)
    source, target = Blob(len(data), ctypes.cast(buffer, ctypes.POINTER(ctypes.c_char))), Blob()
    api = ctypes.windll.crypt32.CryptUnprotectData if decrypt else ctypes.windll.crypt32.CryptProtectData
    if not api(ctypes.byref(source), None, None, None, None, 1, ctypes.byref(target)):
        raise ctypes.WinError()
    try:
        return ctypes.string_at(target.data, target.size)
    finally:
        ctypes.windll.kernel32.LocalFree(target.data)

def read_secret(name):
    path = LOCAL / (name + '.dpapi')
    return crypt(base64.b64decode(path.read_bytes()), True).decode() if path.exists() else None

def write_secret(name, value):
    LOCAL.mkdir(exist_ok=True)
    path = LOCAL / (name + '.dpapi')
    path.write_bytes(base64.b64encode(crypt(value.encode())))

if __name__ == '__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('action',choices=['init','mail','status']);args=p.parse_args()
    if args.action == 'init':
        if not read_secret('ingest'): write_secret('ingest', secrets.token_urlsafe(48))
        print('Publishing credential is ready and encrypted for this Windows account.')
    elif args.action == 'mail':
        value=getpass.getpass('QQ SMTP authorization code (hidden; not your QQ password): ').strip()
        if not value: raise SystemExit('No change; authorization code was empty.')
        write_secret('qq',value)
        print('QQ authorization code saved locally with Windows encryption.')
    else:
        print(json.dumps({k:bool(read_secret(k)) for k in ['ingest','qq']}))
