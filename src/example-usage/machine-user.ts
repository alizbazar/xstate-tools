import createMachine from './machine'

function trigger() {
  return true
}

const machine = createMachine({
  actions: {
    foo: () => null,
    trigger,
  },
  context: {
    startTime: 123,
  },
  services: {
    foo: () => true,
  },
})
