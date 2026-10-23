import Phaser from 'phaser';

export class AnimationFactory {
  public static registerAnimations(scene: Phaser.Scene): void {
    if (!scene || !scene.anims) return;

    // Player Animations (tex_player: 24x24 frames)
    this.createAnimIfNotExists(scene, 'player_idle', 'tex_player', [0], 1, 0);
    this.createAnimFrameRangeIfNotExists(scene, 'player_run', 'tex_player', 1, 2, 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_shoot', 'tex_player', [13, 14], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_up', 'tex_player', [15, 16], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_shoot_up', 'tex_player', [17, 18], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_down', 'tex_player', [19, 20], 8, -1);
    this.createAnimIfNotExists(scene, 'player_run_shoot_down', 'tex_player', [21, 22], 8, -1);
    this.createAnimIfNotExists(scene, 'player_jump', 'tex_player', [3], 1, 0);
    this.createAnimIfNotExists(scene, 'player_crouch', 'tex_player', [4], 1, 0);
    this.createAnimIfNotExists(scene, 'player_crouch_shoot', 'tex_player', [5], 1, 0);
    this.createAnimIfNotExists(scene, 'player_aim_up', 'tex_player', [6], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_up', 'tex_player', [7], 1, 0);
    this.createAnimIfNotExists(scene, 'player_aim_up_forward', 'tex_player', [8], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_up_forward', 'tex_player', [9], 1, 0);
    this.createAnimIfNotExists(scene, 'player_aim_down_forward', 'tex_player', [10], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_down_forward', 'tex_player', [11], 1, 0);
    this.createAnimIfNotExists(scene, 'player_shoot_forward', 'tex_player', [12], 1, 0);

    // Enemy Animations
    this.createAnimFrameRangeIfNotExists(scene, 'trooper_run', 'tex_enemy_trooper', 0, 1, 6, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'drone_fly', 'tex_enemy_drone', 0, 1, 10, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'jumper_jump', 'tex_enemy_jumper', 0, 1, 6, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'boss_drive', 'tex_enemy_boss', 0, 1, 4, -1);

    // Pickup & VFX Animations
    const capsuleKey = scene.textures?.exists('tex_pickups') ? 'tex_pickups' : 'tex_capsule_flying';
    this.createAnimFrameRangeIfNotExists(scene, 'capsule_spin', capsuleKey, 0, 1, 6, -1);
    this.createAnimFrameRangeIfNotExists(scene, 'enemy_explosion', 'tex_explosion', 0, 3, 16, 0);
    this.createAnimFrameRangeIfNotExists(scene, 'bullet_impact_spark', 'tex_bullet_impact', 0, 3, 24, 0);
    this.createAnimFrameRangeIfNotExists(scene, 'laser_barrier_pulse', 'tex_laser_barrier', 0, 3, 10, -1);
  }

  private static createAnimIfNotExists(
    scene: Phaser.Scene,
    key: string,
    textureKey: string,
    frames: number[],
    frameRate: number,
    repeat: number
  ): void {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: textureKey, frame })),
      frameRate,
      repeat,
    });
  }

  private static createAnimFrameRangeIfNotExists(
    scene: Phaser.Scene,
    key: string,
    textureKey: string,
    start: number,
    end: number,
    frameRate: number,
    repeat: number
  ): void {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(textureKey, { start, end }),
      frameRate,
      repeat,
    });
  }
}
