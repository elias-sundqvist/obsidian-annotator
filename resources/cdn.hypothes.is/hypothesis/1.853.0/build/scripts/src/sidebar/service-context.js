/* global process */

/**
 * This module provides dependency injection of services into React
 * components via React's "context" API [1].
 *
 * [1] See https://reactjs.org/docs/context.html#api and
 *     https://reactjs.org/docs/hooks-reference.html#usecontext
 */

/**
 * @typedef {import("redux").Store} Store
 */

import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

/**
 * @typedef ServiceProvider
 * @prop {(serviceName: string) => any} get
 */

/** @type {ServiceProvider} */
const fallbackInjector = {
  get(service) {
    throw new Error(
      `Missing ServiceContext provider to provide "${service}" prop`
    );
  },
};

/**
 * Context type for a service dependency injector.
 *
 * The value should be an object with a `get(serviceName)` method which returns
 * the instance of the named value or service.
 *
 * Consumers will either use this directly via `useContext` or use the
 * `withServices` wrapper.
 */
export const ServiceContext = createContext(fallbackInjector);

/**
 * @template Props
 * @typedef {import("preact").ComponentType<Props>} ComponentType
 */

/**
 * Wrap a Preact component to inject specified props using a dependency injector.
 *
 * The returned component accepts the same props as the input component, except
 * for those listed in the `serviceNames` argument. When the component is rendered
 * the dependency injector is looked up using `useContext(ServiceContext)` and
 * values for these props are obtained from the injector.
 *
 * As a convenience for testing, the props specified by `serviceNames` can still
 * be passed to the returned component. In this case they will override the
 * injected values.
 *
 * @example
 *   function MyComponent({ settings }) {
 *     return ...
 *   }
 *
 *   // Wrap `MyComponent` to inject "settings" service from context.
 *   export default withServices(MyComponent, ['settings']);
 *
 * @template Props
 * @template {string} ServiceName
 * @param {ComponentType<Props>} Component
 * @param {ServiceName[]} serviceNames - List of prop names that should be injected
 * @return {ComponentType<Omit<Props,ServiceName>>}
 */
export function withServices(Component, serviceNames) {
  function Wrapper(props) {
    // Get the current dependency injector instance that is provided by a
    // `ServiceContext.Provider` somewhere higher up the component tree.
    const injector = useContext(ServiceContext);

    // Inject services, unless they have been overridden by props passed from
    // the parent component.

    /** @type {Record<string,unknown>} */
    const services = {};
    for (let service of serviceNames) {
      // Debugging check to make sure the store is used correctly.
      if (process.env.NODE_ENV !== 'production') {
        if (service === 'store') {
          throw new Error(
            'Do not use `withServices` to inject the `store` service. Use the `useStore` hook instead'
          );
        }
      }

      if (!(service in props)) {
        services[service] = injector.get(service);
      }
    }
    return <Component {...services} {...props} />;
  }

  // Set the name of the wrapper for use in debug tools and queries in Enzyme
  // tests.
  const wrappedName = Component.displayName || Component.name;
  Wrapper.displayName = `withServices(${wrappedName})`;

  return Wrapper;
}

/**
 * Hook for looking up a service within a component or a custom hook.
 *
 * This is an alternative to `withServices` that is mainly useful in the
 * context of custom hooks.
 *
 * @param {string} service - Name of the service to look up
 * @return {Object}
 */
export function useService(service) {
  const injector = useContext(ServiceContext);
  return injector.get(service);
}
