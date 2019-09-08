import createMachine from './machine'

const trigger = () => true

export default createMachine({
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
