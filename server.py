from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, join_room, leave_room, emit
import random, string

app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins='*')

rooms = {}  # room_code -> {players:{'X':sid,'O':sid}, turn:'X', board:[...]} 

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    return send_from_directory('.', path)

def random_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

@socketio.on('create_room')
def handle_create_room():
    room = random_room_code()
    while room in rooms:
        room = random_room_code()
    join_room(room)
    rooms[room] = {'players': {'X': request.sid}, 'turn': 'X', 'board': [''] * 9}
    emit('room_created', {'room': room, 'symbol': 'X'}, to=request.sid)

@socketio.on('join_room')
def handle_join_room(data):
    room = data.get('room', '').upper()
    if room not in rooms:
        emit('room_error', {'error': 'Room not found.'}, to=request.sid)
        return
    if 'O' in rooms[room]['players']:
        emit('room_error', {'error': 'Room is full.'}, to=request.sid)
        return
    join_room(room)
    rooms[room]['players']['O'] = request.sid
    emit('room_joined', {'room': room, 'symbol': 'O'}, to=request.sid)
    emit('start_game', {'room': room, 'yourSymbol': 'X'}, to=rooms[room]['players']['X'])
    emit('start_game', {'room': room, 'yourSymbol': 'O'}, to=rooms[room]['players']['O'])

@socketio.on('make_move')
def handle_make_move(data):
    room = data.get('room')
    idx = data.get('idx')
    symbol = data.get('symbol')
    if room not in rooms or symbol not in ['X', 'O']:
        return
    state = rooms[room]
    if state['turn'] != symbol:
        return
    if idx is None or idx < 0 or idx > 8 or state['board'][idx] != '':
        return
    state['board'][idx] = symbol
    state['turn'] = 'O' if symbol == 'X' else 'X'
    emit('opponent_move', {'idx': idx, 'symbol': symbol}, room=room, include_self=False)

@socketio.on('round_end')
def handle_round_end(data):
    room = data.get('room')
    winner = data.get('winner')
    if room not in rooms:
        return
    # reset board for next round
    rooms[room]['board'] = [''] * 9
    rooms[room]['turn'] = 'X'
    emit('round_result', {'winner': winner}, room=room)

@socketio.on('disconnect')
def handle_disconnect():
    for room, state in list(rooms.items()):
        if request.sid in state['players'].values():
            leave_room(room)
            for sym, sid in list(state['players'].items()):
                if sid == request.sid:
                    del state['players'][sym]
            emit('opponent_left', room=room)
            if not state['players']:
                del rooms[room]
            break

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
