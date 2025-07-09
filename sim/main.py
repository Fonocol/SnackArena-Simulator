import sys
import os


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


from config import GRID_WIDTH
from core.env import Env
from core.env_wrapper import ShooterEnvWrapper
from core.rl_snacke.train_dqn import DQNTrainer


def train_dqn():

    trainer = DQNTrainer(state_dim=5*8 +12, action_dim=4)
    episodes_to_export = 50  # Épisodes à exporter

    for episode in range(1000):
        env = Env()
        wrapper = ShooterEnvWrapper(env, env.snake)
        flat_state,minimap = wrapper.reset()

        for _ in range(5000):
            
            action = trainer.select_action(flat_state,minimap,epoche =episode)
            next_state, next_minimap, reward, done = wrapper.step(action)
            trainer.replay_buffer.push(flat_state, minimap,action, reward, next_state,next_minimap, done)
            trainer.train_step()
            flat_state = next_state
            minimap= next_minimap
            if done:
                break
            
            
        print(f"✅ Episode {episode + 1} done len : ", len(env.snake.body))
        # Sauvegarde les épisodes intéressants
        if (len(env.snake.body)>=5):
            episode_id = f"episode_{episode + 1}"
            print(f"viewer/{episode_id}.json")
            env.export(path=f"viewer/{episode_id}.json")

    
    print("🏁 Entraînement DQN terminé.")


if __name__ == "__main__":
    train_dqn()
