/**
 * @typedef Provider
 * @prop {any} [value] - The value for the object
 * @prop {Function} [class] - A class that should be instantiated to create the object
 * @prop {Function} [factory] - Function that should be called to create the object
 */

/**
 * @param {Provider} provider
 */
function isValidProvider(provider) {
  if (typeof provider !== 'object' || provider === null) {
    return false;
  }

  return (
    'value' in provider ||
    typeof provider.class === 'function' ||
    typeof provider.factory === 'function'
  );
}

/**
 * `Injector` is a dependency injection container.
 *
 * It provides a convenient way to instantiate a set of named objects with
 * dependencies. Objects are constructed using a _provider_, which can be a
 * factory function, class constructor or value.
 *
 * If the provider is a factory function or constructor it may have dependencies
 * which are indicated by a `$inject` property on the function/class which
 * is a list of the names of the dependencies. The `$inject` property can be
 * added manually or by a compiler plugin (eg. `babel-plugin-angularjs-annotate`).
 *
 * To construct an object, call the `register` method with the name and provider
 * for the object and each of its dependencies, and then call
 * the `get` method to construct the object and its dependencies and return it.
 *
 * To run a function with arguments provided by the container, without registering
 * the function in the container for use by other factories or classes,
 * use the `run` method.
 */
export class Injector {
  constructor() {
    // Map of name to object specifying how to create/provide that object.
    this._providers = new Map();

    // Map of name to existing instance.
    this._instances = new Map();

    // Set of instances already being constructed. Used to detect circular
    // dependencies.
    this._constructing = new Set();
  }

  /**
   * Construct or return the existing instance of an object with a given `name`
   *
   * @param {string} name - Name of object to construct
   * @return {any} - The constructed object
   */
  get(name) {
    if (this._instances.has(name)) {
      return this._instances.get(name);
    }

    const provider = this._providers.get(name);

    if (!provider) {
      throw new Error(`"${name}" is not registered`);
    }

    if ('value' in provider) {
      this._instances.set(name, provider.value);
      return provider.value;
    }

    if (this._constructing.has(name)) {
      throw new Error(
        `Encountered a circular dependency when constructing "${name}"`
      );
    }

    this._constructing.add(name);
    try {
      const resolvedDependencies = [];
      const dependencies =
        ('class' in provider && provider.class.$inject) ||
        ('factory' in provider && provider.factory.$inject) ||
        [];

      for (const dependency of dependencies) {
        try {
          resolvedDependencies.push(this.get(dependency));
        } catch (e) {
          const resolveErr = new Error(
            `Failed to construct dependency "${dependency}" of "${name}": ${e.message}`
          );
          // @ts-ignore - `cause` is a custom property
          resolveErr.cause = e;
          throw resolveErr;
        }
      }

      let instance;
      if (provider.class) {
        // eslint-disable-next-line new-cap
        instance = new provider.class(...resolvedDependencies);
      } else {
        const factory = provider.factory;
        instance = factory(...resolvedDependencies);
      }
      this._instances.set(name, instance);

      return instance;
    } finally {
      this._constructing.delete(name);
    }
  }

  /**
   * Register a provider for an object in the container.
   *
   * If `provider` is a function, it is treated like a class. In other words
   * `register(name, SomeClass)` is the same as `register(name, { class: SomeClass })`.
   *
   * @param {string} name - Name of object
   * @param {Function|Provider} provider -
   *   The class or other provider to use to create the object.
   * @return {this}
   */
  register(name, provider) {
    if (typeof provider === 'function') {
      provider = { class: provider };
    } else if (!isValidProvider(provider)) {
      throw new Error(`Invalid provider for "${name}"`);
    }

    this._providers.set(name, provider);
    return this;
  }

  /**
   * Run a function which uses one or more dependencies provided by the
   * container.
   *
   * @param {Function} callback -
   *   A callback to run, with dependencies annotated in the same way as
   *   functions or classes passed to `register`.
   * @return {any} - Returns the result of running the function.
   */
  run(callback) {
    const tempName = 'Injector.run';
    this.register(tempName, { factory: callback });

    try {
      return this.get(tempName);
    } finally {
      this._instances.delete(tempName);
      this._providers.delete(tempName);
    }
  }
}
