import { assign, Machine, EventObject, ActionFunctionMap } from 'xstate'
import createMachineFactory, { getServiceTypes, ActionDefinitionMap, ServiceDefinitionMap } from '..'

const context = {
  foo: 'bar',
  moo: 'poo',
}

interface ExternalContext {
  startTime: number
}

type MachineContext = typeof context & ExternalContext

const machine = Machine({
  id: 'timer',
  initial: 'initial',
  context: context as MachineContext,
  states: {
    initial: {
      onEntry: 'clearTimer',
      on: {
        START: 'running',
      },
    },
    running: {
      on: {
        PAUSE: 'paused',
      },
    },
    paused: {
      on: {
        CONTINUE: 'running',
        CLEAR: 'initial',
      },
    },
  },
})

const actions: ActionFunctionMap<MachineContext, EventObject> = {
  foo: assign({ foo: 'moo' }),
}

type ExternalActions = {
  trigger: (id: string) => Boolean
  foo: () => void
}
const externalActions: ActionDefinitionMap<MachineContext, EventObject, ExternalActions> = {
  trigger: ctx => fn => {
    // do something with ctx before calling the function
    return fn(ctx.foo)
  },
  foo: () => [],
}

type ExternalServices = {
  foo: (id: string) => Boolean
}
const serviceTypes = getServiceTypes<MachineContext, EventObject>()

const serviceDefinitions: ServiceDefinitionMap<MachineContext, EventObject, ExternalServices> = {
  foo: serviceTypes.Promise(ctx => [ctx.foo]),
}

type MachineDependencies = {
  actions: ExternalActions
  context: ExternalContext
  services: ExternalServices
}

export default createMachineFactory<MachineDependencies>(machine)
  .actions(actions)
  .expectingActions(externalActions)
  .expectingServices(serviceDefinitions)
  .build()
