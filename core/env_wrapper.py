# core/rl/env_wrapper.py
import numpy as np

from config import GRID_HEIGHT, GRID_WIDTH
from core.env import Env
from core.point import Point
from core.utils import danger_position, extract_minimap_tensor
MAX_TARGETS = 5


class ShooterEnvWrapper:
    def __init__(self, env: Env, agent):
        self.env = env
        self.agent = agent
        

    def reset(self):
        self.agent = self.env.snake  # à adapter si plusieurs agents
        return self.get_state()

    

    def get_state(self):
        head = self.agent.head()
        facing = self.agent.facing()

        rel_vector = []
        visible_objects = self.agent.get_vision(self.env.targets)
        # Trier les cibles selon leur distance à l'agent
        visible_objects = sorted(
            visible_objects, 
            key=lambda t: self.agent.head().distance_to(t.position)
        )
        
        # Pour chaque cible (jusqu'à MAX_TARGETS), ajouter un vecteur directionnel 8 directions
        for target in visible_objects[:MAX_TARGETS]:
            rel_dir = self.agent.relative_position(target.position)
            rel_vector += [
                float(rel_dir["haut_droite"]),
                float(rel_dir["droite"]),
                float(rel_dir["bas_droite"]),
                float(rel_dir["bas"]),
                float(rel_dir["bas_gauche"]),
                float(rel_dir["gauche"]),
                float(rel_dir["haut_gauche"]),
                float(rel_dir["haut"]),
            ]

        # Padding si on a moins de cibles que MAX_TARGETS
        while len(rel_vector) < MAX_TARGETS * 8:
            rel_vector.append(0.0)

        # Features propres à l'agent
        if len(self.agent.body)>=2:
            fist_body = self.agent.body[1]
        else:
            fist_body = Point(x=0,y=0)
            
        up,down,right,left = danger_position(head)
            
        self_stat = [
            head.x / GRID_WIDTH,
            head.y / GRID_HEIGHT,
            head.x - fist_body.x,
            head.y - fist_body.y,
            facing["facing_angle"],           # devrait être normalisé entre -π et π
            facing["range"] / GRID_WIDTH,     # range normalisé
            facing["fov"] / (2 * np.pi),       # normaliser le fov entre 0 et 1
            
            
            up,down,right,left, self.agent.alive
        ]

        # État tabulaire concaténé
        flat_state = np.array(self_stat + rel_vector, dtype=np.float32)

        # Minimap tensor (vue partielle 2D)
        minimap_tensor = extract_minimap_tensor(self.agent, self.env, grid_size=64)

        return flat_state, minimap_tensor

    
    def _nearest_target_distance(self):
        head = self.agent.head()
        min_dist = float('inf')
        for target in self.env.targets:
            if target.alive:
                dist = np.linalg.norm([head.x - target.position.x, head.y - target.position.y])
                min_dist = min(min_dist, dist)
        return min_dist

    # def step(self, action_idx):
    #     action = self.agent.action_space[action_idx]
    #     self.agent.external_action = action

    #     # prev_head = self.agent.head().copy()
    #     prev_distance_to_nearest = self._nearest_target_distance()

    #     self.env.step()
    #     next_flat, next_minimap = self.get_state()

    #     reward = 0.0

    #     # Récompense de base pour chaque pas survivant (encourage la longévité)
    #     reward += 0.01  # Petite récompense constante par pas

    #     # Bonus pour avoir mangé une cible
    #     if self.env.appelSignal:
    #         reward += 10.0

    #     # Récompense directionnelle
    #     new_distance = self._nearest_target_distance()
    #     distance_diff = prev_distance_to_nearest - new_distance
    #     reward += np.clip(distance_diff * 0.2, -0.1, 0.2)  # Gain/loss borné

    #     # Bonus de progression (augmente avec le step_count)
    #     progress_bonus = min(self.env.step_count * 0.001, 1.0)  # Max 1.0 après 1000 pas
    #     reward += progress_bonus

    #     # Grosse pénalité pour la mort
    #     if not self.agent.alive:
    #         reward -= 20.0
    #         # Pénalité supplémentaire si mort précoce
    #         if self.env.step_count < 50:
    #             reward -= 10.0

    #     done = not self.agent.alive
        
    #     # Bonus de fin d'épisode pour les longues survies
    #     if done and self.env.step_count > 100:
    #         reward += 5.0 * (self.env.step_count / 100)  # Scaling linéaire

    #     return next_flat, next_minimap, reward, done

    def step(self, action_idx):
        action = self.agent.action_space[action_idx]
        self.agent.external_action = action

        # États avant action
        prev_distance = self._nearest_target_distance()
        prev_length = len(self.agent.body)
        prev_head_pos = self.agent.head()

        # Exécution de l'action dans l'environnement
        self.env.step()

        # Nouvel état
        next_flat, next_minimap = self.get_state()

        reward = 0.0
        current_length = len(self.agent.body)
        done = False

        # Paramètres durée de vie dynamique
        BASE_LIFESPAN = 150
        LIFESPAN_PER_SEGMENT = 30
        HUNGER_THRESHOLD = 0.7

        allowed_steps = BASE_LIFESPAN + (current_length * LIFESPAN_PER_SEGMENT)
        time_ratio = self.env.step_count / allowed_steps

        # ===== Récompenses =====

        # 1. Récompense pour survie (plus petit quand serpent plus grand)
        survival_reward = 0.5 / (current_length ** 0.5) if current_length > 0 else 0.0
        reward += survival_reward

        # 2. Bonus croissance (quand le serpent grandit)
        if current_length > prev_length:
            growth_bonus = 15.0 + (5.0 * current_length)
            reward += growth_bonus

        # 3. Pénalité si serpent reste trop longtemps sans manger (faim)
        if time_ratio > HUNGER_THRESHOLD:
            hunger_penalty = (time_ratio - HUNGER_THRESHOLD) * 2.0
            reward -= hunger_penalty

        # 4. Récompense pour se rapprocher des cibles
        new_distance = self._nearest_target_distance()
        distance_diff = prev_distance - new_distance
        reward += np.clip(distance_diff * 0.3, -0.15, 0.3)

        # 5. Bonus pour avoir mangé une cible (appelSignal)
        if self.env.appelSignal:
            reward += 15.0

        # ===== Fin de partie =====
        time_expired = time_ratio >= 1.0
        done = not self.agent.alive or time_expired

        if time_expired:
            overtime = self.env.step_count - allowed_steps
            reward -= min(5.0 + (overtime * 0.01), 10.0)
            self.agent.alive = False
            self.env.done = True

        if not self.agent.alive:
            # Pénalité de mort réduite pour les grands serpents
            death_penalty = -20.0 / (current_length ** 0.7) if current_length > 0 else -20.0
            reward += max(death_penalty, -30.0)

            # Bonus posthume pour longue survie
            if self.env.step_count > BASE_LIFESPAN * 2:
                reward += min(current_length, 10.0)

        # ===== Encouragements supplémentaires =====
        # Petite pénalité si la tête ne bouge pas (évite cycles)
        if self.agent.head() == prev_head_pos:
            reward -= 0.2

        # Optionnel : petit bonus pour explorer de nouvelles zones
        unique_positions = len(set((p.x, p.y) for p in self.agent.body))
        reward += unique_positions * 0.005

        # print(f"{reward:.3f}")
        
        
        reward = np.clip(reward, -10.0, 30.0)


        return next_flat, next_minimap, reward, done
