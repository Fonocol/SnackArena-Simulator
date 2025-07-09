import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import random
from core.env import Env


def simulate(filename="viewer/episode_001.json"):
    env = Env()
    directions = ['UP', 'DOWN', 'LEFT', 'RIGHT']

    for _ in range(20):
        if env.done:
            break
        direction = random.choice(directions)
        env.step(direction)

    env.export(filename)
   

if __name__ == "__main__":
    simulate()
