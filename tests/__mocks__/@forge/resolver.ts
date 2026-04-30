class Resolver {
  private handlers: Record<string, Function> = {};

  define(name: string, handler: Function) {
    this.handlers[name] = handler;
    return this;
  }

  getDefinitions() {
    return this.handlers;
  }
}

export default Resolver;
