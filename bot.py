import asyncio
import json
import os
from pathlib import Path
from datetime import datetime
import qrcode
import io

from piwapp import Client, ConnectionConfig, AuthenticationCreds
from piwapp.events import WAEventType
from aiohttp import web

# Configuration
PHONE_NUMBER = os.getenv('PHONE_NUMBER', '62895329678069')
ADMIN_NUMBERS = ['62895329678069', '6282165656083']
AUTH_FILE = Path('piwapp_auth.json')
DB_FILE = Path('piwapp_messages.db')

# Bot start time
BOT_START_TIME = datetime.now()

# Load sakti data
def load_sakti_data():
    try:
        with open('data/sakti.json', 'r') as f:
            return json.load(f)
    except:
        return []

def save_sakti_data(data):
    with open('data/sakti.json', 'w') as f:
        json.dump(data, f, indent=4)

# Command handlers
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
    
    return f'''*BOT STATUS*

⏰ Uptime: {hours}j {minutes}m {seconds}s
✅ Status: Online
🤖 Version: 1.0.0
🐍 Library: piwapp (Python)'''

async def handle_help(client, chat_id, args):
    if not args:
        return '''*HELP*

!help [command] - Tampilkan bantuan
!ping - Cek bot hidup
!menu - Tampilkan menu
!alive - Status bot
!sakti - Data akun sakti
!updatesakti - Update data (admin)'''
    
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
        text += f'*{i}. {user["name"]}*\n'
        text += f'NIK: {user["nik"]}\n'
        text += f'Password: {user["password"]}\n\n'
    
    text += '─────────────────\n'
    text += '*Untuk copy:* Tekan lama pada NIK/Password'
    return text

async def handle_updatesakti(client, chat_id, sender, args):
    sender_number = sender.replace('@s.whatsapp.net', '')
    if sender_number not in ADMIN_NUMBERS:
        return 'Hanya admin yang bisa mengupdate data!'
    
    if not args:
        return '''*Cara penggunaan:*
!updatesakti add [nama] | [nik] | [password]
!updatesakti update [nama] | [nik] | [password]
!updatesakti delete [nama]
!updatesakti list'''
    
    action = args[0].lower()
    data = load_sakti_data()
    
    if action == 'add':
        rest = ' '.join(args[1:])
        parts = [p.strip() for p in rest.split('|')]
        if len(parts) < 3:
            return 'Format: !updatesakti add [nama] | [nik] | [password]'
        
        name, nik, password = parts
        if any(u['nik'] == nik for u in data):
            return f'NIK {nik} sudah ada di database!'
        
        data.append({'name': name, 'nik': nik, 'password': password})
        save_sakti_data(data)
        return f'Berhasil menambahkan:\n*{name}*\nNIK: {nik}'
    
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
        return f'Berhasil update data:\n*{name}*\nNIK: {nik}'
    
    elif action == 'delete':
        name = ' '.join(args[1:])
        if not name:
            return 'Format: !updatesakti delete [nama]'
        
        index = next((i for i, u in enumerate(data) if u['name'].lower() == name.lower()), None)
        if index is None:
            return f'User "{name}" tidak ditemukan!'
        
        deleted = data.pop(index)
        save_sakti_data(data)
        return f'Berhasil menghapus: *{deleted["name"]}*'
    
    elif action == 'list':
        if not data:
            return 'Database kosong!'
        
        text = '*DAFTAR AKUN SAKTI:*\n\n'
        for i, user in enumerate(data, 1):
            text += f'{i}. {user["name"]}\n'
        return text
    
    else:
        return 'Action tidak valid! Gunakan: add, update, delete, list'

# Auto-reply keywords
AUTO_REPLY = {
    'halo': 'Halo! Ada yang bisa saya bantu?',
    'info': 'Ketik !menu untuk melihat perintah yang tersedia'
}

async def main():
    print('Bot main() started', flush=True)
    os.makedirs('data', exist_ok=True)
    
    # QR image holder for web server
    qr_image_bytes = [None]
    qr_status = ['waiting']
    
    # Web server to serve QR code
    async def handle_index(request):
        if qr_status[0] == 'connected':
            return web.Response(text='<h1>Bot Connected!</h1><p>QR sudah di-scan. Bot online.</p>', content_type='text/html')
        if qr_image_bytes[0]:
            return web.Response(body=qr_image_bytes[0], content_type='image/png')
        return web.Response(text='<h1>Menunggu QR code...</h1><p>Muat ulang halaman ini.</p>', content_type='text/html')
    
    app = web.Application()
    app.router.add_get('/', handle_index)
    
    port = int(os.getenv('PORT', '8080'))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    print(f'Web server running on port {port}', flush=True)
    print(f'Buka URL Railway untuk scan QR code!', flush=True)
    
    # Create auth if not exists
    if AUTH_FILE.exists():
        print('Loading existing auth...')
        creds = AuthenticationCreds.from_json(AUTH_FILE.read_text())
    else:
        print('Creating new auth...')
        creds = AuthenticationCreds.initial()
        AUTH_FILE.write_text(creds.to_json())
    
    # Initialize client
    print('Initializing piwapp client...')
    client = Client(
        creds,
        ConnectionConfig(),
        on_creds_update=lambda c: AUTH_FILE.write_text(c.to_json()),
        keys_path='piwapp_auth.json.keys',
        db_path=str(DB_FILE),
    )
    
    # Commands registry
    commands = {
        'ping': {'handler': handle_ping, 'description': 'Cek bot hidup'},
        'menu': {'handler': handle_menu, 'description': 'Tampilkan menu'},
        'alive': {'handler': handle_alive, 'description': 'Status bot'},
        'help': {'handler': handle_help, 'description': 'Bantuan'},
        'sakti': {'handler': handle_sakti, 'description': 'Data akun sakti'},
        'updatesakti': {'handler': handle_updatesakti, 'description': 'Update data (admin)'},
    }
    
    # Message handler
    async def on_messages(payload):
        try:
            for m in payload.messages:
                chat_id = m['key']['remoteJid']
                sender = m['key'].get('participant') or chat_id
                text = m.get('text', '')
                
                if not text:
                    continue
                
                print(f'Message from {sender}: {text}', flush=True)
                
                # Handle commands
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
                                await client.send_text(chat_id, reply)
                                print(f'Replied to {sender}', flush=True)
                        except Exception as e:
                            print(f'Error handling command: {e}', flush=True)
                            await client.send_text(chat_id, f'Error: {str(e)}')
                    return
                
                # Auto-reply
                text_lower = text.lower()
                for keyword, reply in AUTO_REPLY.items():
                    if keyword in text_lower:
                        await client.send_text(chat_id, reply)
                        print(f'Auto-reply to {sender}', flush=True)
                        return
        except Exception as e:
            print(f'Error in message handler: {e}', flush=True)
    
    # Connection handler
    async def on_connection(update):
        if 'qr' in update:
            qr_data = update['qr']
            # Generate QR PNG
            img = qrcode.make(qr_data)
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            qr_image_bytes[0] = buf.getvalue()
            qr_status[0] = 'qr_ready'
            print('QR code updated! Buka URL Railway untuk scan.', flush=True)
        if update.get('connection') == 'open':
            qr_status[0] = 'connected'
            print('Bot connected successfully!', flush=True)
        if update.get('connection') == 'close':
            qr_status[0] = 'waiting'
            print('Connection closed. Reconnecting...', flush=True)

    # Register event handlers
    client.on("connection.update", on_connection)
    client.events.on(WAEventType.MESSAGES_UPSERT, on_messages)
    
    # Start client
    print('Starting bot...', flush=True)
    print('Waiting for QR code...', flush=True)
    await client.start()

if __name__ == '__main__':
    try:
        print('Bot starting...', flush=True)
        asyncio.run(main())
    except Exception as e:
        print(f'FATAL ERROR: {e}', flush=True)
        import traceback
        traceback.print_exc()
