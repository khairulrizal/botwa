import asyncio
import json
import os
import base64
from pathlib import Path
from datetime import datetime
import qrcode
import io

from piwapp import Client, ConnectionConfig, AuthenticationCreds
from piwapp.events import WAEventType
from aiohttp import web

PHONE_NUMBER = os.getenv('PHONE_NUMBER', '62895329678069')
ADMIN_NUMBERS = ['62895329678069', '6282165656083']
AUTH_FILE = Path('piwapp_auth.json')
DB_FILE = Path('piwapp_messages.db')
BOT_START_TIME = datetime.now()

def load_sakti_data():
    try:
        with open('data/sakti.json', 'r') as f:
            return json.load(f)
    except:
        return []

def save_sakti_data(data):
    with open('data/sakti.json', 'w') as f:
        json.dump(data, f, indent=4)

async def handle_ping(client, chat_id):
    return 'Pong!'

async def handle_menu(client, chat_id, commands):
    text = '*BOT MENU*\n\n'
    for name, cmd in commands.items():
        text += f'!{name} - {cmd["description"]}\n'
    return text

async def handle_alive(client, chat_id):
    uptime = datetime.now() - BOT_START_TIME
    hours = int(uptime.total_seconds() // 3600)
    minutes = int((uptime.total_seconds() % 3600) // 60)
    seconds = int(uptime.total_seconds() % 60)
    return f'*BOT STATUS*\n\nUptime: {hours}j {minutes}m {seconds}s\nStatus: Online\nVersion: 1.0.0\nLibrary: piwapp (Python)'

async def handle_help(client, chat_id, args):
    if not args:
        return '*HELP*\n\n!help [command]\n!ping - Cek bot hidup\n!menu - Tampilkan menu\n!alive - Status bot\n!sakti - Data akun sakti\n!updatesakti - Update data (admin)'
    command = args[0]
    help_text = {
        'ping': '!ping - Cek bot hidup',
        'menu': '!menu - Tampilkan menu',
        'alive': '!alive - Status bot',
        'sakti': '!sakti - Tampilkan data akun sakti',
        'updatesakti': '!updatesakti - Update data (admin only)'
    }
    return help_text.get(command, f'Command "{command}" tidak ditemukan')

async def handle_sakti(client, chat_id):
    data = load_sakti_data()
    if not data:
        return 'Database kosong!'
    text = '*DATA AKUN SAKTI*\n\n'
    for i, user in enumerate(data, 1):
        text += f'*{i}. {user["name"]}*\nNIK: {user["nik"]}\nPassword: {user["password"]}\n\n'
    text += 'Tekan lama pada NIK/Password untuk copy'
    return text

async def handle_updatesakti(client, chat_id, sender, args):
    sender_number = sender.replace('@s.whatsapp.net', '').replace('@lid', '')
    if sender_number not in ADMIN_NUMBERS:
        return 'Hanya admin yang bisa mengupdate data!'
    if not args:
        return '*Cara pakai:*\n!updatesakti add [nama] | [nik] | [pass]\n!updatesakti update [nama] | [nik] | [pass]\n!updatesakti delete [nama]\n!updatesakti list'
    action = args[0].lower()
    data = load_sakti_data()
    if action == 'add':
        rest = ' '.join(args[1:])
        parts = [p.strip() for p in rest.split('|')]
        if len(parts) < 3:
            return 'Format: !updatesakti add [nama] | [nik] | [password]'
        name, nik, password = parts
        if any(u['nik'] == nik for u in data):
            return f'NIK {nik} sudah ada!'
        data.append({'name': name, 'nik': nik, 'password': password})
        save_sakti_data(data)
        return f'Berhasil tambah:\n*{name}*\nNIK: {nik}'
    elif action == 'update':
        rest = ' '.join(args[1:])
        parts = [p.strip() for p in rest.split('|')]
        if len(parts) < 3:
            return 'Format: !updatesakti update [nama] | [nik] | [password]'
        name, nik, password = parts
        index = next((i for i, u in enumerate(data) if u['name'].lower() == name.lower()), None)
        if index is None:
            return f'User "{name}" tidak ditemukan!'
        data[index] = {'name': name, 'nik': nik, 'password': password}
        save_sakti_data(data)
        return f'Berhasil update:\n*{name}*\nNIK: {nik}'
    elif action == 'delete':
        name = ' '.join(args[1:])
        if not name:
            return 'Format: !updatesakti delete [nama]'
        index = next((i for i, u in enumerate(data) if u['name'].lower() == name.lower()), None)
        if index is None:
            return f'User "{name}" tidak ditemukan!'
        deleted = data.pop(index)
        save_sakti_data(data)
        return f'Berhasil hapus: *{deleted["name"]}*'
    elif action == 'list':
        if not data:
            return 'Database kosong!'
        text = '*DAFTAR AKUN:*\n\n'
        for i, user in enumerate(data, 1):
            text += f'{i}. {user["name"]}\n'
        return text
    else:
        return 'Gunakan: add, update, delete, list'

AUTO_REPLY = {
    'halo': 'Halo! Ketik !menu untuk perintah.',
    'info': 'Ketik !menu untuk melihat perintah.'
}

def resolve_lid(client, chat_id):
    if '@s.whatsapp.net' in chat_id:
        return chat_id
    if '@lid' in chat_id:
        lid_key = chat_id.split(':')[0].split('@')[0] if ':' in chat_id else chat_id.split('@')[0]
        try:
            for jid, contact in client.store.contacts.items():
                c_str = str(contact)
                if lid_key in c_str and '@s.whatsapp.net' in jid:
                    return jid
        except:
            pass
    return chat_id

def patch_lid_support(client):
    """Monkey-patch _relay_dm to handle @lid JIDs that USync can't resolve."""
    from piwapp.binary import jids as _j
    from piwapp.api import messages_send as ms
    from piwapp.api.messages import generate_message_id, encode_wa_message
    from piwapp.binary import jid_decode, jid_encode, BinaryNode

    original_relay_dm = client._conn._relay_dm

    async def patched_relay_dm(to_jid, message, msg_id, *, stanza_attrs=None, enc_attrs=None):
        if not to_jid or not to_jid.endswith('@lid'):
            return await original_relay_dm(to_jid, message, msg_id, stanza_attrs=stanza_attrs, enc_attrs=enc_attrs)

        print(f'[LID] Sending directly to {to_jid} (bypass USync)', flush=True)
        me_id = client._conn.creds.me.id
        me_dec = jid_decode(me_id)
        me_user_jid = jid_encode(me_dec.user, "s.whatsapp.net")
        recipient = _j.jid_normalized_user(to_jid)

        targets = [recipient]

        from piwapp.crypto.double_ratchet import SessionBuilder, SessionCipher
        for d in targets:
            if not client._conn.signal_store.contains_session(d):
                try:
                    bundles = ms.parse_prekey_bundles(
                        await client._conn.query(ms.build_prekey_fetch([d], generate_message_tag())))
                    ms.inject_sessions(client._conn.signal_store, bundles)
                except Exception as e:
                    print(f'[LID] Pre-key fetch failed for {d}: {e}', flush=True)

        other_nodes, di1 = ms.create_participant_nodes(client._conn.signal_store, message, targets, enc_attrs)
        stanza = ms.build_message_stanza(
            msg_id, recipient, other_nodes,
            include_device_identity=di1, creds=client._conn.creds, extra_attrs=stanza_attrs,
        )
        await client._conn._send_node(stanza)
        print(f'[LID] Stanza sent to {to_jid}', flush=True)

    client._conn._relay_dm = patched_relay_dm
    print('Patched _relay_dm for LID support', flush=True)

async def safe_send(client, chat_id, text, retries=3):
    for attempt in range(retries):
        try:
            await client.send_text(chat_id, text)
            print(f'Sent to {chat_id}', flush=True)
            return True
        except Exception as e:
            err_type = type(e).__name__
            print(f'Send attempt {attempt+1} failed ({chat_id}): {err_type}: {e}', flush=True)
            if attempt < retries - 1:
                await asyncio.sleep(3)
    return False

async def main():
    print('Bot main() started', flush=True)
    os.makedirs('data', exist_ok=True)

    qr_image_bytes = [None]
    qr_status = ['waiting']

    async def handle_index(request):
        if qr_status[0] == 'connected':
            return web.Response(text='<h1>Bot Connected!</h1><p>Bot online.</p>', content_type='text/html')
        if qr_image_bytes[0]:
            return web.Response(body=qr_image_bytes[0], content_type='image/png')
        return web.Response(text='<h1>Menunggu QR code...</h1><p>Muat ulang.</p>', content_type='text/html')

    app = web.Application()
    app.router.add_get('/', handle_index)
    port = int(os.getenv('PORT', '8080'))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    print(f'Web server on port {port}', flush=True)

    def save_auth(c):
        AUTH_FILE.write_text(c.to_json())
        print('Auth updated. Copy this PIWAPP_AUTH_B64 to Railway env var:', flush=True)
        print(f'PIWAPP_AUTH_B64={base64.b64encode(c.to_json().encode()).decode()}', flush=True)

    if AUTH_FILE.exists():
        print('Loading auth from file...', flush=True)
        creds = AuthenticationCreds.from_json(AUTH_FILE.read_text())
    elif os.getenv('PIWAPP_AUTH_B64'):
        print('Loading auth from env var...', flush=True)
        creds = AuthenticationCreds.from_json(base64.b64decode(os.getenv('PIWAPP_AUTH_B64')).decode())
    else:
        print('Creating new auth...', flush=True)
        creds = AuthenticationCreds.initial()
        AUTH_FILE.write_text(creds.to_json())

    print('Initializing piwapp client...', flush=True)
    client = Client(
        creds,
        ConnectionConfig(),
        on_creds_update=save_auth,
        keys_path='piwapp_auth.json.keys',
        db_path=str(DB_FILE),
    )
    patch_lid_support(client)

    commands = {
        'ping': {'handler': handle_ping, 'description': 'Cek bot hidup'},
        'menu': {'handler': handle_menu, 'description': 'Tampilkan menu'},
        'alive': {'handler': handle_alive, 'description': 'Status bot'},
        'help': {'handler': handle_help, 'description': 'Bantuan'},
        'sakti': {'handler': handle_sakti, 'description': 'Data akun sakti'},
        'updatesakti': {'handler': handle_updatesakti, 'description': 'Update data (admin)'},
    }

    async def on_messages(payload):
        try:
            for m in payload.messages:
                chat_id = m['key']['remoteJid']
                sender = m['key'].get('participant') or chat_id
                text = m.get('text', '')
                if not text:
                    continue
                print(f'Message from {sender}: {text}', flush=True)
                if text.startswith('!'):
                    parts = text.split()
                    command_name = parts[0][1:].lower()
                    args = parts[1:]
                    if command_name in commands:
                        try:
                            if command_name == 'menu':
                                reply = await commands[command_name]['handler'](client, chat_id, commands)
                            elif command_name == 'help':
                                reply = await commands[command_name]['handler'](client, chat_id, args)
                            elif command_name == 'updatesakti':
                                reply = await commands[command_name]['handler'](client, chat_id, sender, args)
                            else:
                                reply = await commands[command_name]['handler'](client, chat_id)
                            if reply:
                                await safe_send(client, chat_id, reply)
                        except Exception as e:
                            print(f'Error handling command: {e}', flush=True)
                    return
                text_lower = text.lower()
                for keyword, reply in AUTO_REPLY.items():
                    if keyword in text_lower:
                        await safe_send(client, chat_id, reply)
                        return
        except Exception as e:
            print(f'Error in message handler: {e}', flush=True)

    async def on_connection(update):
        if 'qr' in update:
            qr_data = update['qr']
            img = qrcode.make(qr_data)
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            qr_image_bytes[0] = buf.getvalue()
            qr_status[0] = 'qr_ready'
            print('QR ready! Open Railway URL to scan.', flush=True)
        if update.get('connection') == 'open':
            qr_status[0] = 'connected'
            print('Bot connected!', flush=True)
        if update.get('connection') == 'close':
            qr_status[0] = 'waiting'
            print('Connection closed. Reconnecting...', flush=True)

    client.on("connection.update", on_connection)
    client.events.on(WAEventType.MESSAGES_UPSERT, on_messages)

    print('Starting bot...', flush=True)
    await client.start()

if __name__ == '__main__':
    try:
        print('Bot starting...', flush=True)
        asyncio.run(main())
    except Exception as e:
        print(f'FATAL ERROR: {e}', flush=True)
        import traceback
        traceback.print_exc()
