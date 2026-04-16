# Tic Tac Toe (X/O) CLI game
# Run with: python tic_tac_toe.py

def draw_board(board):
    print('\nCurrent board:')
    lines = []
    for i in range(3):
        row = board[i*3:(i+1)*3]
        lines.append(' | '.join(c if c != '' else str(i*3+j+1) for j,c in enumerate(row)))
    print('\n---------\n'.join(lines))


def check_winner(board):
    wins = [
        (0,1,2),(3,4,5),(6,7,8),
        (0,3,6),(1,4,7),(2,5,8),
        (0,4,8),(2,4,6)
    ]
    for a,b,c in wins:
        if board[a] != '' and board[a] == board[b] == board[c]:
            return board[a]
    return None


def is_draw(board):
    return all(cell != '' for cell in board)


def main():
    print('Tic Tac Toe - two players Xt or O')
    print('Player 1 = X, Player 2 = O')

    board = ['']*9
    current = 'X'

    while True:
        draw_board(board)
        try:
            move = input(f"{current}'s move (1-9), or q to quit: ").strip()
            if move.lower() == 'q':
                print('Goodbye!')
                return
            idx = int(move) - 1
            if idx < 0 or idx > 8:
                raise ValueError
            if board[idx] != '':
                print('Cell already taken. Choose another.')
                continue
            board[idx] = current
        except ValueError:
            print('Invalid input. Enter a number between 1 and 9.')
            continue

        winner = check_winner(board)
        if winner:
            draw_board(board)
            print(f'Player {winner} wins!')
            break

        if is_draw(board):
            draw_board(board)
            print('It is a draw.')
            break

        current = 'O' if current == 'X' else 'X'

    print('Game over.')


if __name__ == '__main__':
    main()
