// Minimal @tweenjs/tween.js type shim for compilation
// To be replaced with official @types/tween.js when properly configured

declare module "@tweenjs/tween.js" {
  export namespace TWEEN {
    export class Tween<T = any> {
      constructor(object: T);
      to(properties: Partial<T>, duration?: number): Tween<T>;
      start(time?: number): Tween<T>;
      stop(): Tween<T>;
      end(): Tween<T>;
      pause(time?: number): Tween<T>;
      resume(time?: number): Tween<T>;
      delay(amount?: number): Tween<T>;
      repeat(times?: number): Tween<T>;
      repeatDelay(amount?: number): Tween<T>;
      yoyo(yoyo?: boolean): Tween<T>;
      easing(easingFunction?: (amount: number) => number): Tween<T>;
      interpolation(interpolationFunction?: (v: number[], k: number) => number): Tween<T>;
      chain(...tweens: Tween<any>[]): Tween<T>;
      onStart(callback?: (object: T) => void): Tween<T>;
      onUpdate(callback?: (object: T, elapsed: number) => void): Tween<T>;
      onRepeat(callback?: (object: T) => void): Tween<T>;
      onComplete(callback?: (object: T) => void): Tween<T>;
      onStop(callback?: (object: T) => void): Tween<T>;
      update(time?: number): boolean;
      getId(): number;
      isPlaying(): boolean;
      isPaused(): boolean;
    }

    export function update(time?: number): boolean;
    export function getAll(): Tween<any>[];
    export function removeAll(): void;
    export function add(tween: Tween<any>): void;
    export function remove(tween: Tween<any>): void;
    export function now(): number;

    export namespace Easing {
      export namespace Linear {
        export function None(amount: number): number;
      }
      export namespace Quadratic {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Cubic {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Quartic {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Quintic {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Sinusoidal {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Exponential {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Circular {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Elastic {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Back {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
      export namespace Bounce {
        export function In(amount: number): number;
        export function Out(amount: number): number;
        export function InOut(amount: number): number;
      }
    }

    export namespace Interpolation {
      export function Linear(v: number[], k: number): number;
      export function Bezier(v: number[], k: number): number;
      export function CatmullRom(v: number[], k: number): number;
      export namespace Utils {
        export function Linear(p0: number, p1: number, t: number): number;
        export function Bernstein(n: number, i: number): (t: number) => number;
        export function Factorial(n: number): number;
        export function CatmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number;
      }
    }

    export class Group {
      constructor();
      add(tween: Tween<any>): void;
      remove(tween: Tween<any>): void;
      update(time?: number): boolean;
      getAll(): Tween<any>[];
      removeAll(): void;
    }
  }

  export default TWEEN;
}
