export function isAsyncIterable(input: any): boolean {
  return (
    typeof input === 'object' &&
    input !== null &&
    // The AsyncGenerator check is for Safari on iOS which currently does not have
    // Symbol.asyncIterator implemented
    // That means every custom AsyncIterable must be built using a AsyncGeneratorFunction (async function * () {})
    (input[Symbol.toStringTag] === 'AsyncGenerator' || (Symbol.asyncIterator && Symbol.asyncIterator in input))
  );
}

export const makeAsyncIterableIteratorFromSink = (make: any) => {
  const { pushValue, asyncIterableIterator } = makePushPullAsyncIterableIterator();
  const dispose = make({
    next: (value: any) => {
      pushValue(value);
    },
    complete: () => {
      asyncIterableIterator.return();
    },
    error: (err: any) => {
      // The consumer gets the error from its pending or next `next()` call. The promise `throw()` returns
      // rejects with the same error; catch it so it is not reported again as an unhandled rejection.
      asyncIterableIterator.throw(err).catch(() => {});
    },
  });
  const originalReturn = asyncIterableIterator.return;
  let returnValue: any = undefined;
  asyncIterableIterator.return = () => {
    if (returnValue === undefined) {
      dispose();
      returnValue = originalReturn();
    }
    return returnValue;
  };
  return asyncIterableIterator;
};

export function withHandlers(source: any, onReturn: any, onThrow: any) {
  const stream = (async function* withReturnSource() {
    yield* source;
  })();
  const originalReturn = stream.return.bind(stream);
  if (onReturn) {
    stream.return = (...args) => {
      onReturn();
      return originalReturn(...args);
    };
  }
  if (onThrow) {
    const originalThrow = stream.throw.bind(stream);
    stream.throw = err => {
      onThrow(err);
      return originalThrow(err);
    };
  }
  return stream;
}

function createDeferred<T = void>() {
  const d: {
    promise: Promise<T>;
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  } = {} as any;

  d.promise = new Promise<T>((resolve, reject) => {
    d.resolve = resolve;
    d.reject = reject;
  });

  return d;
}

export function makePushPullAsyncIterableIterator() {
  let state: { type: string; error?: any } = { type: 'running' };
  let next = createDeferred();
  const values: any[] = [];
  function pushValue(value: any) {
    if (state.type !== 'running') return;
    values.push(value);
    next.resolve();
    next = createDeferred();
  }
  const source = (async function* PushPullAsyncIterableIterator() {
    while (true) {
      if (values.length > 0) {
        yield values.shift();
      } else {
        if (state.type === 'error') throw state.error;
        if (state.type === 'finished') return;
        await next.promise;
      }
    }
  })();
  const stream = withHandlers(
    source,
    () => {
      if (state.type !== 'running') return;
      state = { type: 'finished' };
      next.resolve();
    },
    (error: any) => {
      if (state.type !== 'running') return;
      state = { type: 'error', error };
      next.resolve();
    },
  );
  return { pushValue, asyncIterableIterator: stream };
}
