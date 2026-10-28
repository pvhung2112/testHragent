declare namespace jest {
  type Mock<T = any, Y extends any[] = any[]> = {
    (...args: Y): T;
    _isMockFunction: true;
    getMockName(): string;
    getMockImplementation(): ((...args: Y) => T) | undefined;
    mock: {
      calls: Y[];
      instances: T[];
      invocationCallOrder: number[];
      results: Array<{ type: 'return' | 'throw'; value: any }>;
      lastCall?: Y;
    };
    mockClear(): void;
    mockReset(): void;
    mockRestore(): void;
    mockResolvedValue(value: any): Mock<Promise<any>, Y>;
    mockResolvedValueOnce(value: any): Mock<Promise<any>, Y>;
    mockRejectedValue(value: any): Mock<Promise<any>, Y>;
    mockRejectedValueOnce(value: any): Mock<Promise<any>, Y>;
    mockReturnValue(value: T): Mock<T, Y>;
    mockReturnValueOnce(value: T): Mock<T, Y>;
    mockImplementation(fn: (...args: Y) => T): Mock<T, Y>;
    mockImplementationOnce(fn: (...args: Y) => T): Mock<T, Y>;
  };

  type Mocked<T> = {
    [P in keyof T]: T[P] extends (...args: infer Args) => infer Ret
      ? Mock<Ret, Args> & T[P]
      : T[P];
  } & T;

  function fn<T = any, Y extends any[] = any[]>(implementation?: (...args: Y) => T): Mock<T, Y>;
  function spyOn<T extends {}, M extends keyof T>(object: T, method: M): Mock;
  function clearAllMocks(): void;
  function resetAllMocks(): void;
  function restoreAllMocks(): void;
}

declare const jest: {
  fn: typeof jest.fn;
  spyOn: typeof jest.spyOn;
  clearAllMocks: typeof jest.clearAllMocks;
  resetAllMocks: typeof jest.resetAllMocks;
  restoreAllMocks: typeof jest.restoreAllMocks;
  [key: string]: any;
};

interface Matchers<R> {
  toBe(expected: any): R;
  toEqual(expected: any): R;
  toBeNull(): R;
  toBeUndefined(): R;
  toBeDefined(): R;
  toBeTruthy(): R;
  toBeFalsy(): R;
  toHaveLength(expected: number): R;
  toContain(expected: any): R;
  toThrow(expected?: string | RegExp | Error): R;
  toHaveBeenCalled(): R;
  toHaveBeenCalledTimes(expected: number): R;
  toHaveBeenCalledWith(...expected: any[]): R;
  toHaveBeenLastCalledWith(...expected: any[]): R;
  not: Matchers<R>;
  rejects: Matchers<Promise<R>>;
  resolves: Matchers<Promise<R>>;
}

declare function expect<T = any>(actual: T): Matchers<void>;

declare function describe(name: string, fn: () => void | Promise<void>): void;
declare namespace describe {
  function skip(name: string, fn: () => void | Promise<void>): void;
  function only(name: string, fn: () => void | Promise<void>): void;
}

declare function it(name: string, fn: () => void | Promise<any>): void;
declare namespace it {
  function skip(name: string, fn: () => void | Promise<any>): void;
  function only(name: string, fn: () => void | Promise<any>): void;
}

declare function test(name: string, fn: () => void | Promise<any>): void;
declare namespace test {
  function skip(name: string, fn: () => void | Promise<any>): void;
  function only(name: string, fn: () => void | Promise<any>): void;
}

declare function beforeAll(fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
