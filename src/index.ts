import {
  assign,
  ActionFunctionMap,
  InvokeCreator,
  EventObject,
  MachineOptions,
  ConditionPredicate,
  StateMachine,
} from 'xstate'

export const saveError = assign({
  error: (_: any, e: any) => {
    if (/^xstate\.after/.test(e.type)) {
      return {
        code: 'TIMEOUT',
        message: 'Operation failed. Please try again.',
      }
    }
    // Errors can come in several forms: for services throwing an error results in the error
    // being stored in data. If the error is forward in the machine, it is stored in .error propery.
    // Lastly, if the error is just an internal event, let's just store the whole event.
    const isExternalError = e.data && e.data instanceof Error
    const err = isExternalError ? e.data : e.error || e
    const code = err.code || e.type || 'UNKNOWN_ERROR'
    const message = err.message || 'An error occurred. Please try again.'
    return { message, code }
  },
})

type FunctionExecuter = (fn: any) => ReturnType<typeof fn>
type TExecuter<TContext, TEventObject> = (ctx: TContext, e: TEventObject) => any[] | FunctionExecuter

export type ActionDefinitionMap<TContext, TEventObject, TExternalActions> = {
  [P in keyof TExternalActions]: TExecuter<TContext, TEventObject>
}

interface FunctionMap {
  [key: string]: Function
}

export const connectActions = (actionDefinitions: FunctionMap, extActions: FunctionMap) =>
  Object.keys(actionDefinitions).reduce((acc: FunctionMap, key) => {
    if (extActions[key]) {
      acc[key] = (ctx: any, e: any) => {
        const actionArgs = actionDefinitions[key](ctx, e)
        if (typeof actionArgs === 'function') {
          return actionArgs(extActions[key])
        }
        return extActions[key](...actionArgs)
      }
    } else {
      console.warn(`Action '${key}' was not provided`)
    }
    return acc
  }, {})

export const connectServices = (services: FunctionMap, extServices: FunctionMap) =>
  Object.keys(services).reduce((acc: FunctionMap, key) => {
    if (extServices[key]) {
      acc[key] = (ctx: any, e: any) => {
        const serviceSpec = services[key](ctx, e)
        return extServices[key](...serviceSpec.args)
      }
    } else {
      console.warn(`Service '${key}' was not provided`)
    }
    return acc
  }, {}) as Record<string, InvokeCreator<any, any>>

export type ServiceDefinitionMap<TContext, TEventObject, TExternalServices> = {
  [P in keyof TExternalServices]: ServiceType<TContext, TEventObject>
}

class ServiceType<TContext, TEventObject> {
  constructor(public type: string, public executer: TExecuter<TContext, TEventObject>) {}
}

export const getServiceTypes = <TContext, TEventObject>() => {
  return {
    Promise: (executer: TExecuter<TContext, TEventObject>) =>
      new ServiceType<TContext, TEventObject>('promise', executer),
    Callback: (executer: TExecuter<TContext, TEventObject>) =>
      new ServiceType<TContext, TEventObject>('callback', executer),
    Machine: (executer: TExecuter<TContext, TEventObject>) =>
      new ServiceType<TContext, TEventObject>('machine', executer),
  }
}

export const serviceTypes = getServiceTypes<any, any>()

class MachineBuilder<MachineDependencies> {
  private machine: StateMachine<any, any, EventObject>
  private internalActions = {}
  private internalGuards?: Record<string, ConditionPredicate<any, EventObject>>
  private actionDefinitions = {}
  private serviceDefinitions = {}

  constructor(machine: StateMachine<any, any, EventObject>) {
    this.machine = machine
  }

  /**
   * Set internal actions
   */
  actions(actions: ActionFunctionMap<any, any>) {
    this.internalActions = actions
    return this
  }

  /**
   * Set guards
   */
  guards(guards: Record<string, ConditionPredicate<any, EventObject>>) {
    this.internalGuards = guards
    return this
  }

  /**
   * Set signatures for expected actions
   */
  expectingActions(actionDefinitions: ActionDefinitionMap<any, any, any>) {
    this.actionDefinitions = actionDefinitions
    return this
  }

  /**
   * Set signatures for expected services
   */
  expectingServices(serviceDefinitions: ServiceDefinitionMap<any, any, any>) {
    this.serviceDefinitions = serviceDefinitions
    return this
  }

  /**
   * Build createMachine({ context, actions, services }) factory
   */
  build() {
    /**
     * Create machine by supplying context, actions, or services
     */
    const createMachine = (config: MachineDependencies) => {
      const actions = (config as any).actions || {}
      const services = (config as any).services || {}
      const context = (config as any).context || {}
      const options: Partial<MachineOptions<any, EventObject>> = {
        actions: {
          ...this.internalActions,
          ...connectActions(this.actionDefinitions, actions),
        },
        services: connectServices(this.serviceDefinitions, services),
        guards: this.internalGuards,
      }
      const machineContext = {
        ...(this.machine.context || {}),
        ...context,
      }
      return this.machine.withConfig(options, machineContext)
    }
    return createMachine
  }
}

export const createMachineFactory = <MachineDependencies>(machine: StateMachine<any, any, EventObject>) => {
  return new MachineBuilder<MachineDependencies>(machine)
}

export default createMachineFactory
