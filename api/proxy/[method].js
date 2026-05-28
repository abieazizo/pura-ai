"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/zustand/esm/vanilla.mjs
var createStoreImpl, createStore;
var init_vanilla = __esm({
  "node_modules/zustand/esm/vanilla.mjs"() {
    createStoreImpl = (createState) => {
      let state;
      const listeners = /* @__PURE__ */ new Set();
      const setState = (partial, replace) => {
        const nextState = typeof partial === "function" ? partial(state) : partial;
        if (!Object.is(nextState, state)) {
          const previousState = state;
          state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
          listeners.forEach((listener) => listener(state, previousState));
        }
      };
      const getState = () => state;
      const getInitialState = () => initialState;
      const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };
      const api = { setState, getState, getInitialState, subscribe };
      const initialState = state = createState(setState, getState, api);
      return api;
    };
    createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
  }
});

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports2) {
    "use strict";
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
    var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    var ReactSharedInternals = { H: null, A: null, T: null, S: null, V: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, self, source, owner, props) {
      self = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== self ? self : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(
        oldElement.type,
        newKey,
        void 0,
        void 0,
        void 0,
        oldElement.props
      );
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape2(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape2("" + element.key) : index.toString(36);
    }
    function noop$1() {
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop$1, noop$1) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    function noop2() {
    }
    exports2.Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports2.Component = Component;
    exports2.Fragment = REACT_FRAGMENT_TYPE;
    exports2.Profiler = REACT_PROFILER_TYPE;
    exports2.PureComponent = PureComponent;
    exports2.StrictMode = REACT_STRICT_MODE_TYPE;
    exports2.Suspense = REACT_SUSPENSE_TYPE;
    exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports2.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports2.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports2.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key, owner = void 0;
      if (null != config)
        for (propName in void 0 !== config.ref && (owner = void 0), void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, void 0, void 0, owner, props);
    };
    exports2.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports2.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, void 0, void 0, null, props);
    };
    exports2.createRef = function() {
      return { current: null };
    };
    exports2.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports2.isValidElement = isValidElement;
    exports2.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports2.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports2.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop2, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        ReactSharedInternals.T = prevTransition;
      }
    };
    exports2.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports2.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports2.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports2.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports2.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports2.useDebugValue = function() {
    };
    exports2.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports2.useEffect = function(create2, createDeps, update) {
      var dispatcher = ReactSharedInternals.H;
      if ("function" === typeof update)
        throw Error(
          "useEffect CRUD overload is not enabled in this build of React."
        );
      return dispatcher.useEffect(create2, createDeps);
    };
    exports2.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports2.useImperativeHandle = function(ref, create2, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create2, deps);
    };
    exports2.useInsertionEffect = function(create2, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create2, deps);
    };
    exports2.useLayoutEffect = function(create2, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create2, deps);
    };
    exports2.useMemo = function(create2, deps) {
      return ReactSharedInternals.H.useMemo(create2, deps);
    };
    exports2.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports2.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports2.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports2.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports2.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports2.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports2.version = "19.1.0";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports2, module2) {
    "use strict";
    "production" !== process.env.NODE_ENV && (function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }
        });
      }
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function ComponentDummy() {
      }
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      function testStringCoercion(value) {
        return "" + value;
      }
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return (type.displayName || "Context") + ".Provider";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      function ReactElement(type, key, self, source, owner, props, debugStack, debugTask) {
        self = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== self ? self : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          void 0,
          void 0,
          oldElement._owner,
          oldElement.props,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function escape2(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape2("" + element.key)) : index.toString(36);
      }
      function noop$1() {
      }
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop$1, noop$1) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i = 0; i < children.length; i++)
            nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i = getIteratorFn(children), "function" === typeof i)
          for (i === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ctor = payload._result;
          ctor = ctor();
          ctor.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status)
                payload._status = 1, payload._result = moduleObject;
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status)
                payload._status = 2, payload._result = error;
            }
          );
          -1 === payload._status && (payload._status = 0, payload._result = ctor);
        }
        if (1 === payload._status)
          return ctor = payload._result, void 0 === ctor && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ctor
          ), "default" in ctor || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ctor
          ), ctor.default;
        throw payload._result;
      }
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      function noop2() {
      }
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module2 && module2[requireString]).call(
              module2,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            };
          }
        return enqueueTaskImpl(task);
      }
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i = 0;
          try {
            for (; i < queue.length; i++) {
              var callback = queue[i];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i] = callback;
                    queue.splice(0, i);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
      /* @__PURE__ */ Symbol.for("react.provider");
      var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"), REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: function() {
          return false;
        },
        enqueueForceUpdate: function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        },
        enqueueReplaceState: function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        },
        enqueueSetState: function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      }, fnName;
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        V: null,
        actQueue: null,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        "react-stack-bottom-frame": function(callStackForError) {
          return callStackForError();
        }
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs["react-stack-bottom-frame"].bind(deprecatedAPIs, UnknownOwner)();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: function(size) {
          return resolveDispatcher().useMemoCache(size);
        }
      });
      exports2.Children = {
        map: mapChildren,
        forEach: function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        },
        count: function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        },
        toArray: function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        },
        only: function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }
      };
      exports2.Component = Component;
      exports2.Fragment = REACT_FRAGMENT_TYPE;
      exports2.Profiler = REACT_PROFILER_TYPE;
      exports2.PureComponent = PureComponent;
      exports2.StrictMode = REACT_STRICT_MODE_TYPE;
      exports2.Suspense = REACT_SUSPENSE_TYPE;
      exports2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports2.__COMPILER_RUNTIME = deprecatedAPIs;
      exports2.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }
        };
      };
      exports2.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports2.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports2.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i = 0; i < propName; i++)
            JSCompiler_inline_result[i] = arguments[i + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          void 0,
          void 0,
          owner,
          props,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          owner = arguments[key], isValidElement(owner) && owner._store && (owner._store.validated = 1);
        return props;
      };
      exports2.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports2.createElement = function(type, config, children) {
        for (var i = 2; i < arguments.length; i++) {
          var node = arguments[i];
          isValidElement(node) && node._store && (node._store.validated = 1);
        }
        i = {};
        node = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), node = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i[propName] && (i[propName] = childrenLength[propName]);
        node && defineKeyPropWarningGetter(
          i,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          node,
          void 0,
          void 0,
          getOwner(),
          i,
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports2.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports2.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }
        });
        return elementType;
      };
      exports2.isValidElement = isValidElement;
      exports2.lazy = function(ctor) {
        return {
          $$typeof: REACT_LAZY_TYPE,
          _payload: { _status: -1, _result: ctor },
          _init: lazyInitializer
        };
      };
      exports2.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: function() {
            return ownName;
          },
          set: function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }
        });
        return compare;
      };
      exports2.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        ReactSharedInternals.T = currentTransition;
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop2, reportGlobalError);
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), ReactSharedInternals.T = prevTransition;
        }
      };
      exports2.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports2.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports2.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports2.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports2.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports2.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports2.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports2.useEffect = function(create2, createDeps, update) {
        null == create2 && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        var dispatcher = resolveDispatcher();
        if ("function" === typeof update)
          throw Error(
            "useEffect CRUD overload is not enabled in this build of React."
          );
        return dispatcher.useEffect(create2, createDeps);
      };
      exports2.useId = function() {
        return resolveDispatcher().useId();
      };
      exports2.useImperativeHandle = function(ref, create2, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create2, deps);
      };
      exports2.useInsertionEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create2, deps);
      };
      exports2.useLayoutEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create2, deps);
      };
      exports2.useMemo = function(create2, deps) {
        return resolveDispatcher().useMemo(create2, deps);
      };
      exports2.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports2.useReducer = function(reducer, initialArg, init) {
        return resolveDispatcher().useReducer(reducer, initialArg, init);
      };
      exports2.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports2.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports2.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports2.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports2.version = "19.1.0";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production();
    } else {
      module2.exports = require_react_development();
    }
  }
});

// node_modules/zustand/esm/react.mjs
function useStore(api, selector = identity) {
  const slice = import_react.default.useSyncExternalStore(
    api.subscribe,
    import_react.default.useCallback(() => selector(api.getState()), [api, selector]),
    import_react.default.useCallback(() => selector(api.getInitialState()), [api, selector])
  );
  import_react.default.useDebugValue(slice);
  return slice;
}
var import_react, identity, createImpl, create;
var init_react = __esm({
  "node_modules/zustand/esm/react.mjs"() {
    import_react = __toESM(require_react(), 1);
    init_vanilla();
    identity = (arg) => arg;
    createImpl = (createState) => {
      const api = createStore(createState);
      const useBoundStore = (selector) => useStore(api, selector);
      Object.assign(useBoundStore, api);
      return useBoundStore;
    };
    create = ((createState) => createState ? createImpl(createState) : createImpl);
  }
});

// node_modules/zustand/esm/index.mjs
var init_esm = __esm({
  "node_modules/zustand/esm/index.mjs"() {
    init_vanilla();
    init_react();
  }
});

// src/ai/aiTelemetry.ts
var aiTelemetry_exports = {};
__export(aiTelemetry_exports, {
  aiTelemetry: () => aiTelemetry,
  useAITelemetry: () => useAITelemetry
});
function emptyMethodMap() {
  const out = {};
  for (const k of METHOD_KEYS) {
    out[k] = { ...EMPTY_METHOD_SNAPSHOT, counts: { ok: 0, fail: 0, fallback: 0 } };
  }
  return out;
}
function emptyFeatureMap() {
  const out = {};
  for (const k of FEATURE_KEYS) {
    out[k] = { ...EMPTY_FEATURE_SNAPSHOT };
  }
  return out;
}
var EMPTY_METHOD_SNAPSHOT, EMPTY_FEATURE_SNAPSHOT, METHOD_KEYS, FEATURE_KEYS, LOG_BUFFER_LIMIT, useAITelemetry, aiTelemetry;
var init_aiTelemetry = __esm({
  "src/ai/aiTelemetry.ts"() {
    "use strict";
    init_esm();
    EMPTY_METHOD_SNAPSHOT = {
      status: "idle",
      source: "idle",
      requestId: null,
      durationMs: null,
      error: null,
      updatedAt: null,
      counts: { ok: 0, fail: 0, fallback: 0 }
    };
    EMPTY_FEATURE_SNAPSHOT = {
      source: "idle",
      detail: "",
      updatedAt: null
    };
    METHOD_KEYS = [
      // v11.7 — preflight added to the gateway. Was missing from this
      // registry, which caused the runtime crash:
      //   beginMethodCall('validateScanPreflight') would set a partial
      //   snapshot (no `counts` field) because the spread of `undefined`
      //   produces nothing → completeMethodCallFail then reads
      //   `prev.counts.fail` and crashes with "Cannot read property
      //   'fail' of undefined" → the whole face-scan flow dies silently.
      "validateScanPreflight",
      "analyzeFaceScan",
      "analyzeFaceScanV2",
      "identifyProductFromImage",
      "normalizeBarcodeResolution",
      "matchProductsForUser",
      "generateRoutineRecommendation",
      "explainSkinScore",
      "explainProgress",
      "buildSearchSuggestions",
      "answerAssistant",
      "analyzeScannedProductAgainstUser",
      "buildFullScanToPlanBundle",
      "buildProgressBundle",
      "lookupLiveProducts",
      "rerankProducts",
      "recommendProductsForUser",
      "selectProductForSlot",
      "planTypedSearch"
    ];
    FEATURE_KEYS = [
      "scan",
      "productScan",
      "barcode",
      "products",
      "routine",
      "progress",
      "assistant",
      "search"
    ];
    LOG_BUFFER_LIMIT = 50;
    useAITelemetry = create((set, get) => ({
      methods: emptyMethodMap(),
      features: emptyFeatureMap(),
      logs: [],
      healthz: { ok: null, pingedAt: null, latencyMs: null, detail: null },
      beginMethodCall(method, requestId) {
        set((s) => ({
          methods: {
            ...s.methods,
            // v11.12 — fall back to a fully-shaped snapshot if `method`
            // wasn't pre-registered in METHOD_KEYS. Previously a missing
            // key (e.g. v11.7's `validateScanPreflight`) caused the spread
            // of `undefined` to produce a snapshot without `counts`, which
            // then crashed completeMethodCallFail downstream.
            [method]: {
              ...EMPTY_METHOD_SNAPSHOT,
              ...s.methods[method] ?? {},
              status: "pending",
              source: "pending",
              requestId,
              durationMs: null,
              error: null,
              updatedAt: Date.now()
            }
          }
        }));
      },
      completeMethodCallOk(method, durationMs) {
        set((s) => {
          const prev = s.methods[method] ?? EMPTY_METHOD_SNAPSHOT;
          const counts = prev.counts ?? { ok: 0, fail: 0, fallback: 0 };
          return {
            methods: {
              ...s.methods,
              [method]: {
                ...prev,
                status: "ok",
                source: "ai",
                durationMs,
                error: null,
                updatedAt: Date.now(),
                counts: { ...counts, ok: counts.ok + 1 }
              }
            }
          };
        });
      },
      completeMethodCallFail(method, durationMs, error) {
        set((s) => {
          const prev = s.methods[method] ?? EMPTY_METHOD_SNAPSHOT;
          const counts = prev.counts ?? { ok: 0, fail: 0, fallback: 0 };
          return {
            methods: {
              ...s.methods,
              [method]: {
                ...prev,
                status: "fail",
                source: "fallback",
                durationMs,
                error,
                updatedAt: Date.now(),
                counts: { ...counts, fail: counts.fail + 1 }
              }
            }
          };
        });
      },
      countFallback(method) {
        set((s) => {
          const prev = s.methods[method] ?? EMPTY_METHOD_SNAPSHOT;
          const counts = prev.counts ?? { ok: 0, fail: 0, fallback: 0 };
          return {
            methods: {
              ...s.methods,
              [method]: {
                ...prev,
                counts: { ...counts, fallback: counts.fallback + 1 }
              }
            }
          };
        });
      },
      setFeatureSource(feature, source, detail) {
        set((s) => ({
          features: {
            ...s.features,
            [feature]: { source, detail, updatedAt: Date.now() }
          }
        }));
      },
      pushLog(record) {
        set((s) => {
          const next = [record, ...s.logs];
          if (next.length > LOG_BUFFER_LIMIT) next.length = LOG_BUFFER_LIMIT;
          return { logs: next };
        });
      },
      setHealthz(result) {
        set({ healthz: result });
      },
      reset() {
        set({
          methods: emptyMethodMap(),
          features: emptyFeatureMap(),
          logs: [],
          healthz: { ok: null, pingedAt: null, latencyMs: null, detail: null }
        });
        void get;
      }
    }));
    aiTelemetry = {
      beginMethodCall(method, requestId) {
        useAITelemetry.getState().beginMethodCall(method, requestId);
      },
      completeMethodCallOk(method, durationMs) {
        useAITelemetry.getState().completeMethodCallOk(method, durationMs);
      },
      completeMethodCallFail(method, durationMs, error) {
        useAITelemetry.getState().completeMethodCallFail(method, durationMs, error);
      },
      countFallback(method) {
        useAITelemetry.getState().countFallback(method);
      },
      setFeatureSource(feature, source, detail) {
        useAITelemetry.getState().setFeatureSource(feature, source, detail);
      },
      pushLog(record) {
        useAITelemetry.getState().pushLog(record);
      },
      setHealthz(result) {
        useAITelemetry.getState().setHealthz(result);
      }
    };
  }
});

// api/proxy/_handler.ts
var handler_exports = {};
__export(handler_exports, {
  default: () => handler
});
module.exports = __toCommonJS(handler_exports);

// node_modules/openai/internal/tslib.mjs
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m")
    throw new TypeError("Private method is not writable");
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f)
    throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

// node_modules/openai/internal/utils/uuid.mjs
var uuid4 = function() {
  const { crypto: crypto2 } = globalThis;
  if (crypto2?.randomUUID) {
    uuid4 = crypto2.randomUUID.bind(crypto2);
    return crypto2.randomUUID();
  }
  const u8 = new Uint8Array(1);
  const randomByte = crypto2 ? () => crypto2.getRandomValues(u8)[0] : () => Math.random() * 255 & 255;
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (+c ^ randomByte() & 15 >> +c / 4).toString(16));
};

// node_modules/openai/internal/errors.mjs
function isAbortError(err) {
  return typeof err === "object" && err !== null && // Spec-compliant fetch implementations
  ("name" in err && err.name === "AbortError" || // Expo fetch
  "message" in err && String(err.message).includes("FetchRequestCanceledException"));
}
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      if (Object.prototype.toString.call(err) === "[object Error]") {
        const error = new Error(err.message, err.cause ? { cause: err.cause } : {});
        if (err.stack)
          error.stack = err.stack;
        if (err.cause && !error.cause)
          error.cause = err.cause;
        if (err.name)
          error.name = err.name;
        return error;
      }
    } catch {
    }
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
};

// node_modules/openai/core/error.mjs
var OpenAIError = class extends Error {
};
var APIError = class _APIError extends OpenAIError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.requestID = headers?.get("x-request-id");
    this.error = error;
    const data = error;
    this.code = data?.["code"];
    this.param = data?.["param"];
    this.type = data?.["type"];
  }
  static makeMessage(status, error, message) {
    const msg = error?.message ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse?.["error"];
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};
var LengthFinishReasonError = class extends OpenAIError {
  constructor() {
    super(`Could not parse response content as the length limit was reached`);
  }
};
var ContentFilterFinishReasonError = class extends OpenAIError {
  constructor() {
    super(`Could not parse response content as the request was rejected by the content filter`);
  }
};
var InvalidWebhookSignatureError = class extends Error {
  constructor(message) {
    super(message);
  }
};
var OAuthError = class extends APIError {
  constructor(status, error, headers) {
    let finalMessage = "OAuth2 authentication error";
    let error_code = void 0;
    if (error && typeof error === "object") {
      const errorData = error;
      error_code = errorData["error"];
      const description = errorData["error_description"];
      if (description && typeof description === "string") {
        finalMessage = description;
      } else if (error_code) {
        finalMessage = error_code;
      }
    }
    super(status, error, finalMessage, headers);
    this.error_code = error_code;
  }
};
var SubjectTokenProviderError = class extends OpenAIError {
  constructor(message, provider, cause) {
    super(message);
    this.provider = provider;
    this.cause = cause;
  }
};

// node_modules/openai/internal/utils/values.mjs
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var isArray = (val) => (isArray = Array.isArray, isArray(val));
var isReadonlyArray = isArray;
function maybeObj(x) {
  if (typeof x !== "object") {
    return {};
  }
  return x ?? {};
}
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new OpenAIError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new OpenAIError(`${name} must be a positive integer`);
  }
  return n;
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
};

// node_modules/openai/internal/utils/sleep.mjs
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// node_modules/openai/version.mjs
var VERSION = "6.35.0";

// node_modules/openai/internal/detect-platform.mjs
var isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== "undefined" && // @ts-ignore
    typeof window.document !== "undefined" && // @ts-ignore
    typeof navigator !== "undefined"
  );
};
function getDetectedPlatform() {
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return "deno";
  }
  if (typeof EdgeRuntime !== "undefined") {
    return "edge";
  }
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") {
    return "node";
  }
  return "unknown";
}
var getPlatformProperties = () => {
  const detectedPlatform = getDetectedPlatform();
  if (detectedPlatform === "deno") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : Deno.version?.deno ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": globalThis.process.version
    };
  }
  if (detectedPlatform === "node") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(globalThis.process.platform ?? "unknown"),
      "X-Stainless-Arch": normalizeArch(globalThis.process.arch ?? "unknown"),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": globalThis.process.version ?? "unknown"
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};

// node_modules/openai/internal/shims.mjs
function getDefaultFetch() {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new OpenAI({ fetch })` or polyfill the global, `globalThis.fetch = fetch`");
}
function makeReadableStream(...args) {
  const ReadableStream = globalThis.ReadableStream;
  if (typeof ReadableStream === "undefined") {
    throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  }
  return new ReadableStream(...args);
}
function ReadableStreamFrom(iterable) {
  let iter = Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {
    },
    async pull(controller) {
      const { done, value } = await iter.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    async cancel() {
      await iter.return?.();
    }
  });
}
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result?.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object")
    return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  const reader = stream.getReader();
  const cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}

// node_modules/openai/internal/request-options.mjs
var FallbackEncoder = ({ headers, body }) => {
  return {
    bodyHeaders: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
};

// node_modules/openai/internal/qs/formats.mjs
var default_format = "RFC3986";
var default_formatter = (v) => String(v);
var formatters = {
  RFC1738: (v) => String(v).replace(/%20/g, "+"),
  RFC3986: default_formatter
};
var RFC1738 = "RFC1738";

// node_modules/openai/internal/qs/utils.mjs
var has = (obj, key) => (has = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty), has(obj, key));
var hex_table = /* @__PURE__ */ (() => {
  const array = [];
  for (let i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
})();
var limit = 1024;
var encode = (str2, _defaultEncoder, charset, _kind, format) => {
  if (str2.length === 0) {
    return str2;
  }
  let string = str2;
  if (typeof str2 === "symbol") {
    string = Symbol.prototype.toString.call(str2);
  } else if (typeof str2 !== "string") {
    string = String(str2);
  }
  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }
  let out = "";
  for (let j = 0; j < string.length; j += limit) {
    const segment = string.length >= limit ? string.slice(j, j + limit) : string;
    const arr = [];
    for (let i = 0; i < segment.length; ++i) {
      let c = segment.charCodeAt(i);
      if (c === 45 || // -
      c === 46 || // .
      c === 95 || // _
      c === 126 || // ~
      c >= 48 && c <= 57 || // 0-9
      c >= 65 && c <= 90 || // a-z
      c >= 97 && c <= 122 || // A-Z
      format === RFC1738 && (c === 40 || c === 41)) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hex_table[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
        continue;
      }
      i += 1;
      c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
      arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
    }
    out += arr.join("");
  }
  return out;
};
function is_buffer(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function maybe_map(val, fn) {
  if (isArray(val)) {
    const mapped = [];
    for (let i = 0; i < val.length; i += 1) {
      mapped.push(fn(val[i]));
    }
    return mapped;
  }
  return fn(val);
}

// node_modules/openai/internal/qs/stringify.mjs
var array_prefix_generators = {
  brackets(prefix) {
    return String(prefix) + "[]";
  },
  comma: "comma",
  indices(prefix, key) {
    return String(prefix) + "[" + key + "]";
  },
  repeat(prefix) {
    return String(prefix);
  }
};
var push_to_array = function(arr, value_or_array) {
  Array.prototype.push.apply(arr, isArray(value_or_array) ? value_or_array : [value_or_array]);
};
var toISOString;
var defaults = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: encode,
  encodeValuesOnly: false,
  format: default_format,
  formatter: default_formatter,
  /** @deprecated */
  indices: false,
  serializeDate(date) {
    return (toISOString ?? (toISOString = Function.prototype.call.bind(Date.prototype.toISOString)))(date);
  },
  skipNulls: false,
  strictNullHandling: false
};
function is_non_nullish_primitive(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
var sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
  let obj = object;
  let tmp_sc = sideChannel;
  let step = 0;
  let find_flag = false;
  while ((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag) {
    const pos = tmp_sc.get(object);
    step += 1;
    if (typeof pos !== "undefined") {
      if (pos === step) {
        throw new RangeError("Cyclic object value");
      } else {
        find_flag = true;
      }
    }
    if (typeof tmp_sc.get(sentinel) === "undefined") {
      step = 0;
    }
  }
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate?.(obj);
  } else if (generateArrayPrefix === "comma" && isArray(obj)) {
    obj = maybe_map(obj, function(value) {
      if (value instanceof Date) {
        return serializeDate?.(value);
      }
      return value;
    });
  }
  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? (
        // @ts-expect-error
        encoder(prefix, defaults.encoder, charset, "key", format)
      ) : prefix;
    }
    obj = "";
  }
  if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
    if (encoder) {
      const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, "key", format);
      return [
        formatter?.(key_value) + "=" + // @ts-expect-error
        formatter?.(encoder(obj, defaults.encoder, charset, "value", format))
      ];
    }
    return [formatter?.(prefix) + "=" + formatter?.(String(obj))];
  }
  const values = [];
  if (typeof obj === "undefined") {
    return values;
  }
  let obj_keys;
  if (generateArrayPrefix === "comma" && isArray(obj)) {
    if (encodeValuesOnly && encoder) {
      obj = maybe_map(obj, encoder);
    }
    obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
  } else if (isArray(filter)) {
    obj_keys = filter;
  } else {
    const keys = Object.keys(obj);
    obj_keys = sort ? keys.sort(sort) : keys;
  }
  const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
  const adjusted_prefix = commaRoundTrip && isArray(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
  if (allowEmptyArrays && isArray(obj) && obj.length === 0) {
    return adjusted_prefix + "[]";
  }
  for (let j = 0; j < obj_keys.length; ++j) {
    const key = obj_keys[j];
    const value = (
      // @ts-ignore
      typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key]
    );
    if (skipNulls && value === null) {
      continue;
    }
    const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
    const key_prefix = isArray(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
    sideChannel.set(object, step);
    const valueSideChannel = /* @__PURE__ */ new WeakMap();
    valueSideChannel.set(sentinel, sideChannel);
    push_to_array(values, inner_stringify(
      value,
      key_prefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      // @ts-ignore
      generateArrayPrefix === "comma" && encodeValuesOnly && isArray(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ));
  }
  return values;
}
function normalize_stringify_options(opts = defaults) {
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  const charset = opts.charset || defaults.charset;
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  let format = default_format;
  if (typeof opts.format !== "undefined") {
    if (!has(formatters, opts.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    format = opts.format;
  }
  const formatter = formatters[format];
  let filter = defaults.filter;
  if (typeof opts.filter === "function" || isArray(opts.filter)) {
    filter = opts.filter;
  }
  let arrayFormat;
  if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
    arrayFormat = opts.arrayFormat;
  } else if ("indices" in opts) {
    arrayFormat = opts.indices ? "indices" : "repeat";
  } else {
    arrayFormat = defaults.arrayFormat;
  }
  if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
  return {
    addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults.addQueryPrefix,
    // @ts-ignore
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
    commaRoundTrip: !!opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === "undefined" ? defaults.delimiter : opts.delimiter,
    encode: typeof opts.encode === "boolean" ? opts.encode : defaults.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
    encoder: typeof opts.encoder === "function" ? opts.encoder : defaults.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults.serializeDate,
    skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults.skipNulls,
    // @ts-ignore
    sort: typeof opts.sort === "function" ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
  };
}
function stringify(object, opts = {}) {
  let obj = object;
  const options = normalize_stringify_options(opts);
  let obj_keys;
  let filter;
  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (isArray(options.filter)) {
    filter = options.filter;
    obj_keys = filter;
  }
  const keys = [];
  if (typeof obj !== "object" || obj === null) {
    return "";
  }
  const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
  const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
  if (!obj_keys) {
    obj_keys = Object.keys(obj);
  }
  if (options.sort) {
    obj_keys.sort(options.sort);
  }
  const sideChannel = /* @__PURE__ */ new WeakMap();
  for (let i = 0; i < obj_keys.length; ++i) {
    const key = obj_keys[i];
    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    push_to_array(keys, inner_stringify(
      obj[key],
      key,
      // @ts-expect-error
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel
    ));
  }
  const joined = keys.join(options.delimiter);
  let prefix = options.addQueryPrefix === true ? "?" : "";
  if (options.charsetSentinel) {
    if (options.charset === "iso-8859-1") {
      prefix += "utf8=%26%2310003%3B&";
    } else {
      prefix += "utf8=%E2%9C%93&";
    }
  }
  return joined.length > 0 ? prefix + joined : "";
}

// node_modules/openai/internal/utils/query.mjs
function stringifyQuery(query) {
  return stringify(query, { arrayFormat: "brackets" });
}

// node_modules/openai/internal/utils/bytes.mjs
function concatBytes(buffers) {
  let length = 0;
  for (const buffer of buffers) {
    length += buffer.length;
  }
  const output = new Uint8Array(length);
  let index = 0;
  for (const buffer of buffers) {
    output.set(buffer, index);
    index += buffer.length;
  }
  return output;
}
var encodeUTF8_;
function encodeUTF8(str2) {
  let encoder;
  return (encodeUTF8_ ?? (encoder = new globalThis.TextEncoder(), encodeUTF8_ = encoder.encode.bind(encoder)))(str2);
}
var decodeUTF8_;
function decodeUTF8(bytes) {
  let decoder;
  return (decodeUTF8_ ?? (decoder = new globalThis.TextDecoder(), decodeUTF8_ = decoder.decode.bind(decoder)))(bytes);
}

// node_modules/openai/internal/decoders/line.mjs
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  constructor() {
    _LineDecoder_buffer.set(this, void 0);
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    __classPrivateFieldSet(this, _LineDecoder_buffer, concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]), "f");
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f")), "f");
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = decodeUTF8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
      lines.push(line);
      __classPrivateFieldSet(this, _LineDecoder_buffer, __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  flush() {
    if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_buffer = /* @__PURE__ */ new WeakMap(), _LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

// node_modules/openai/internal/utils/log.mjs
var levelNumbers = {
  off: 0,
  error: 200,
  warn: 300,
  info: 400,
  debug: 500
};
var parseLogLevel = (maybeLevel, sourceName, client) => {
  if (!maybeLevel) {
    return void 0;
  }
  if (hasOwn(levelNumbers, maybeLevel)) {
    return maybeLevel;
  }
  loggerFor(client).warn(`${sourceName} was set to ${JSON.stringify(maybeLevel)}, expected one of ${JSON.stringify(Object.keys(levelNumbers))}`);
  return void 0;
};
function noop() {
}
function makeLogFn(fnLevel, logger, logLevel) {
  if (!logger || levelNumbers[fnLevel] > levelNumbers[logLevel]) {
    return noop;
  } else {
    return logger[fnLevel].bind(logger);
  }
}
var noopLogger = {
  error: noop,
  warn: noop,
  info: noop,
  debug: noop
};
var cachedLoggers = /* @__PURE__ */ new WeakMap();
function loggerFor(client) {
  const logger = client.logger;
  const logLevel = client.logLevel ?? "off";
  if (!logger) {
    return noopLogger;
  }
  const cachedLogger = cachedLoggers.get(logger);
  if (cachedLogger && cachedLogger[0] === logLevel) {
    return cachedLogger[1];
  }
  const levelLogger = {
    error: makeLogFn("error", logger, logLevel),
    warn: makeLogFn("warn", logger, logLevel),
    info: makeLogFn("info", logger, logLevel),
    debug: makeLogFn("debug", logger, logLevel)
  };
  cachedLoggers.set(logger, [logLevel, levelLogger]);
  return levelLogger;
}
var formatRequestDetails = (details) => {
  if (details.options) {
    details.options = { ...details.options };
    delete details.options["headers"];
  }
  if (details.headers) {
    details.headers = Object.fromEntries((details.headers instanceof Headers ? [...details.headers] : Object.entries(details.headers)).map(([name, value]) => [
      name,
      name.toLowerCase() === "authorization" || name.toLowerCase() === "cookie" || name.toLowerCase() === "set-cookie" ? "***" : value
    ]));
  }
  if ("retryOfRequestLogID" in details) {
    if (details.retryOfRequestLogID) {
      details.retryOf = details.retryOfRequestLogID;
    }
    delete details.retryOfRequestLogID;
  }
  return details;
};

// node_modules/openai/core/streaming.mjs
var _Stream_client;
var Stream = class _Stream {
  constructor(iterator, controller, client) {
    this.iterator = iterator;
    _Stream_client.set(this, void 0);
    this.controller = controller;
    __classPrivateFieldSet(this, _Stream_client, client, "f");
  }
  static fromSSEResponse(response, controller, client, synthesizeEventData) {
    let consumed = false;
    const logger = client ? loggerFor(client) : console;
    async function* iterator() {
      if (consumed) {
        throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (done)
            continue;
          if (sse.data.startsWith("[DONE]")) {
            done = true;
            continue;
          }
          if (sse.event === null || !sse.event.startsWith("thread.")) {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              logger.error(`Could not parse message into JSON:`, sse.data);
              logger.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (data && data.error) {
              throw new APIError(void 0, data.error, void 0, response.headers);
            }
            yield synthesizeEventData ? { event: sse.event, data } : data;
          } else {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (sse.event == "error") {
              throw new APIError(void 0, data.error, data.message, void 0);
            }
            yield { event: sse.event, data };
          }
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller, client) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new OpenAIError("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (isAbortError(e))
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller, client);
  }
  [(_Stream_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller, __classPrivateFieldGet(this, _Stream_client, "f")),
      new _Stream(() => teeIterator(right), this.controller, __classPrivateFieldGet(this, _Stream_client, "f"))
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    return makeReadableStream({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encodeUTF8(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        await iter.return?.();
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative") {
      throw new OpenAIError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
    }
    throw new OpenAIError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? encodeUTF8(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str2, delimiter) {
  const index = str2.indexOf(delimiter);
  if (index !== -1) {
    return [str2.substring(0, index), delimiter, str2.substring(index + delimiter.length)];
  }
  return [str2, "", ""];
}

// node_modules/openai/internal/parse.mjs
async function defaultParseResponse(client, props) {
  const { response, requestLogID, retryOfRequestLogID, startTime } = props;
  const body = await (async () => {
    if (props.options.stream) {
      loggerFor(client).debug("response", response.status, response.url, response.headers, response.body);
      if (props.options.__streamClass) {
        return props.options.__streamClass.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
      }
      return Stream.fromSSEResponse(response, props.controller, client, props.options.__synthesizeEventData);
    }
    if (response.status === 204) {
      return null;
    }
    if (props.options.__binaryResponse) {
      return response;
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0]?.trim();
    const isJSON = mediaType?.includes("application/json") || mediaType?.endsWith("+json");
    if (isJSON) {
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") {
        return void 0;
      }
      const json = await response.json();
      return addRequestID(json, response);
    }
    const text = await response.text();
    return text;
  })();
  loggerFor(client).debug(`[${requestLogID}] response parsed`, formatRequestDetails({
    retryOfRequestLogID,
    url: response.url,
    status: response.status,
    body,
    durationMs: Date.now() - startTime
  }));
  return body;
}
function addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("x-request-id"),
    enumerable: false
  });
}

// node_modules/openai/core/api-promise.mjs
var _APIPromise_client;
var APIPromise = class _APIPromise extends Promise {
  constructor(client, responsePromise, parseResponse2 = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse2;
    _APIPromise_client.set(this, void 0);
    __classPrivateFieldSet(this, _APIPromise_client, client, "f");
  }
  _thenUnwrap(transform) {
    return new _APIPromise(__classPrivateFieldGet(this, _APIPromise_client, "f"), this.responsePromise, async (client, props) => addRequestID(transform(await this.parseResponse(client, props), props), props.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the X-Request-ID header which is useful for debugging requests and reporting
   * issues to OpenAI.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` or add `"lib": ["DOM"]`
   * to your `tsconfig.json`.
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("x-request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then((data) => this.parseResponse(__classPrivateFieldGet(this, _APIPromise_client, "f"), data));
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
_APIPromise_client = /* @__PURE__ */ new WeakMap();

// node_modules/openai/core/pagination.mjs
var _AbstractPage_client;
var AbstractPage = class {
  constructor(client, response, body, options) {
    _AbstractPage_client.set(this, void 0);
    __classPrivateFieldSet(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageRequestOptions() != null;
  }
  async getNextPage() {
    const nextOptions = this.nextPageRequestOptions();
    if (!nextOptions) {
      throw new OpenAIError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    return await __classPrivateFieldGet(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var PagePromise = class extends APIPromise {
  constructor(client, request, Page2) {
    super(client, request, async (client2, props) => new Page2(client2, props.response, await defaultParseResponse(client2, props), props.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var Page = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.object = body.object;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  nextPageRequestOptions() {
    return null;
  }
};
var CursorPage = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const data = this.getPaginatedItems();
    const id = data[data.length - 1]?.id;
    if (!id) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after: id
      }
    };
  }
};
var ConversationCursorPage = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
    this.last_id = body.last_id || "";
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  nextPageRequestOptions() {
    const cursor = this.last_id;
    if (!cursor) {
      return null;
    }
    return {
      ...this.options,
      query: {
        ...maybeObj(this.options.query),
        after: cursor
      }
    };
  }
};

// node_modules/openai/auth/workload-identity-auth.mjs
var SUBJECT_TOKEN_TYPES = {
  jwt: "urn:ietf:params:oauth:token-type:jwt",
  id: "urn:ietf:params:oauth:token-type:id_token"
};
var TOKEN_EXCHANGE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
var WorkloadIdentityAuth = class {
  constructor(config, fetch2) {
    this.cachedToken = null;
    this.refreshPromise = null;
    this.tokenExchangeUrl = "https://auth.openai.com/oauth/token";
    this.config = config;
    this.fetch = fetch2 ?? getDefaultFetch();
  }
  async getToken() {
    if (!this.cachedToken || this.isTokenExpired(this.cachedToken)) {
      if (this.refreshPromise) {
        return await this.refreshPromise;
      }
      this.refreshPromise = this.refreshToken();
      try {
        const token = await this.refreshPromise;
        return token;
      } finally {
        this.refreshPromise = null;
      }
    }
    if (this.needsRefresh(this.cachedToken) && !this.refreshPromise) {
      this.refreshPromise = this.refreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.cachedToken.token;
  }
  async refreshToken() {
    const subjectToken = await this.config.provider.getToken();
    const response = await this.fetch(this.tokenExchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: TOKEN_EXCHANGE_GRANT_TYPE,
        client_id: this.config.clientId,
        subject_token: subjectToken,
        subject_token_type: SUBJECT_TOKEN_TYPES[this.config.provider.tokenType],
        identity_provider_id: this.config.identityProviderId,
        service_account_id: this.config.serviceAccountId
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      let body = void 0;
      try {
        body = JSON.parse(errorText);
      } catch {
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new OAuthError(response.status, body, response.headers);
      }
      throw APIError.generate(response.status, body, `Token exchange failed with status ${response.status}`, response.headers);
    }
    const tokenResponse = await response.json();
    const expiresIn = tokenResponse.expires_in || 3600;
    const expiresAt = Date.now() + expiresIn * 1e3;
    this.cachedToken = {
      token: tokenResponse.access_token,
      expiresAt
    };
    return tokenResponse.access_token;
  }
  isTokenExpired(cachedToken) {
    return Date.now() >= cachedToken.expiresAt;
  }
  needsRefresh(cachedToken) {
    const bufferSeconds = this.config.refreshBufferSeconds ?? 1200;
    const bufferMs = bufferSeconds * 1e3;
    return Date.now() >= cachedToken.expiresAt - bufferMs;
  }
  invalidateToken() {
    this.cachedToken = null;
    this.refreshPromise = null;
  }
};

// node_modules/openai/internal/uploads.mjs
var checkFileSupport = () => {
  if (typeof File === "undefined") {
    const { process: process2 } = globalThis;
    const isOldNode = typeof process2?.versions?.node === "string" && parseInt(process2.versions.node.split(".")) < 20;
    throw new Error("`File` is not defined as a global, which is required for file uploads." + (isOldNode ? " Update to Node 20 LTS or newer, or set `globalThis.File` to `import('node:buffer').File`." : ""));
  }
};
function makeFile(fileBits, fileName, options) {
  checkFileSupport();
  return new File(fileBits, fileName ?? "unknown_file", options);
}
function getName(value) {
  return (typeof value === "object" && value !== null && ("name" in value && value.name && String(value.name) || "url" in value && value.url && String(value.url) || "filename" in value && value.filename && String(value.filename) || "path" in value && value.path && String(value.path)) || "").split(/[\\/]/).pop() || void 0;
}
var isAsyncIterable = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var maybeMultipartFormRequestOptions = async (opts, fetch2) => {
  if (!hasUploadableValue(opts.body))
    return opts;
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var multipartFormRequestOptions = async (opts, fetch2) => {
  return { ...opts, body: await createForm(opts.body, fetch2) };
};
var supportsFormDataMap = /* @__PURE__ */ new WeakMap();
function supportsFormData(fetchObject) {
  const fetch2 = typeof fetchObject === "function" ? fetchObject : fetchObject.fetch;
  const cached = supportsFormDataMap.get(fetch2);
  if (cached)
    return cached;
  const promise = (async () => {
    try {
      const FetchResponse = "Response" in fetch2 ? fetch2.Response : (await fetch2("data:,")).constructor;
      const data = new FormData();
      if (data.toString() === await new FetchResponse(data).text()) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  })();
  supportsFormDataMap.set(fetch2, promise);
  return promise;
}
var createForm = async (body, fetch2) => {
  if (!await supportsFormData(fetch2)) {
    throw new TypeError("The provided fetch function does not support file uploads with the current global FormData class.");
  }
  const form = new FormData();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var isNamedBlob = (value) => value instanceof Blob && "name" in value;
var isUploadable = (value) => typeof value === "object" && value !== null && (value instanceof Response || isAsyncIterable(value) || isNamedBlob(value));
var hasUploadableValue = (value) => {
  if (isUploadable(value))
    return true;
  if (Array.isArray(value))
    return value.some(hasUploadableValue);
  if (value && typeof value === "object") {
    for (const k in value) {
      if (hasUploadableValue(value[k]))
        return true;
    }
  }
  return false;
};
var addFormValue = async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (value instanceof Response) {
    form.append(key, makeFile([await value.blob()], getName(value)));
  } else if (isAsyncIterable(value)) {
    form.append(key, makeFile([await new Response(ReadableStreamFrom(value)).blob()], getName(value)));
  } else if (isNamedBlob(value)) {
    form.append(key, value, getName(value));
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/openai/internal/to-file.mjs
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
async function toFile(value, name, options) {
  checkFileSupport();
  value = await value;
  if (isFileLike(value)) {
    if (value instanceof File) {
      return value;
    }
    return makeFile([await value.arrayBuffer()], value.name);
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop());
    return makeFile(await getBytes(blob), name, options);
  }
  const parts = await getBytes(value);
  name || (name = getName(value));
  if (!options?.type) {
    const type = parts.find((part) => typeof part === "object" && "type" in part && part.type);
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return makeFile(parts, name, options);
}
async function getBytes(value) {
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(value instanceof Blob ? value : await value.arrayBuffer());
  } else if (isAsyncIterable(value)) {
    for await (const chunk of value) {
      parts.push(...await getBytes(chunk));
    }
  } else {
    const constructor = value?.constructor?.name;
    throw new Error(`Unexpected data type: ${typeof value}${constructor ? `; constructor: ${constructor}` : ""}${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  if (typeof value !== "object" || value === null)
    return "";
  const props = Object.getOwnPropertyNames(value);
  return `; props: [${props.map((p) => `"${p}"`).join(", ")}]`;
}

// node_modules/openai/core/resource.mjs
var APIResource = class {
  constructor(client) {
    this._client = client;
  }
};

// node_modules/openai/internal/utils/path.mjs
function encodeURIPath(str2) {
  return str2.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
var EMPTY = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.create(null));
var createPathTagFunction = (pathEncoder = encodeURIPath) => function path2(statics, ...params) {
  if (statics.length === 1)
    return statics[0];
  let postPath = false;
  const invalidSegments = [];
  const path3 = statics.reduce((previousValue, currentValue, index) => {
    if (/[?#]/.test(currentValue)) {
      postPath = true;
    }
    const value = params[index];
    let encoded = (postPath ? encodeURIComponent : pathEncoder)("" + value);
    if (index !== params.length && (value == null || typeof value === "object" && // handle values from other realms
    value.toString === Object.getPrototypeOf(Object.getPrototypeOf(value.hasOwnProperty ?? EMPTY) ?? EMPTY)?.toString)) {
      encoded = value + "";
      invalidSegments.push({
        start: previousValue.length + currentValue.length,
        length: encoded.length,
        error: `Value of type ${Object.prototype.toString.call(value).slice(8, -1)} is not a valid path parameter`
      });
    }
    return previousValue + currentValue + (index === params.length ? "" : encoded);
  }, "");
  const pathOnly = path3.split(/[?#]/, 1)[0];
  const invalidSegmentPattern = /(?<=^|\/)(?:\.|%2e){1,2}(?=\/|$)/gi;
  let match;
  while ((match = invalidSegmentPattern.exec(pathOnly)) !== null) {
    invalidSegments.push({
      start: match.index,
      length: match[0].length,
      error: `Value "${match[0]}" can't be safely passed as a path parameter`
    });
  }
  invalidSegments.sort((a, b) => a.start - b.start);
  if (invalidSegments.length > 0) {
    let lastEnd = 0;
    const underline = invalidSegments.reduce((acc, segment) => {
      const spaces = " ".repeat(segment.start - lastEnd);
      const arrows = "^".repeat(segment.length);
      lastEnd = segment.start + segment.length;
      return acc + spaces + arrows;
    }, "");
    throw new OpenAIError(`Path parameters result in path with invalid segments:
${invalidSegments.map((e) => e.error).join("\n")}
${path3}
${underline}`);
  }
  return path3;
};
var path = /* @__PURE__ */ createPathTagFunction(encodeURIPath);

// node_modules/openai/resources/chat/completions/messages.mjs
var Messages = class extends APIResource {
  /**
   * Get the messages in a stored chat completion. Only Chat Completions that have
   * been created with the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletionStoreMessage of client.chat.completions.messages.list(
   *   'completion_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(completionID, query = {}, options) {
    return this._client.getAPIList(path`/chat/completions/${completionID}/messages`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/lib/parser.mjs
function isChatCompletionFunctionTool(tool) {
  return tool !== void 0 && "function" in tool && tool.function !== void 0;
}
function isAutoParsableResponseFormat(response_format) {
  return response_format?.["$brand"] === "auto-parseable-response-format";
}
function isAutoParsableTool(tool) {
  return tool?.["$brand"] === "auto-parseable-tool";
}
function maybeParseChatCompletion(completion, params) {
  if (!params || !hasAutoParseableInput(params)) {
    return {
      ...completion,
      choices: completion.choices.map((choice) => {
        assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
        return {
          ...choice,
          message: {
            ...choice.message,
            parsed: null,
            ...choice.message.tool_calls ? {
              tool_calls: choice.message.tool_calls
            } : void 0
          }
        };
      })
    };
  }
  return parseChatCompletion(completion, params);
}
function parseChatCompletion(completion, params) {
  const choices = completion.choices.map((choice) => {
    if (choice.finish_reason === "length") {
      throw new LengthFinishReasonError();
    }
    if (choice.finish_reason === "content_filter") {
      throw new ContentFilterFinishReasonError();
    }
    assertToolCallsAreChatCompletionFunctionToolCalls(choice.message.tool_calls);
    return {
      ...choice,
      message: {
        ...choice.message,
        ...choice.message.tool_calls ? {
          tool_calls: choice.message.tool_calls?.map((toolCall) => parseToolCall(params, toolCall)) ?? void 0
        } : void 0,
        parsed: choice.message.content && !choice.message.refusal ? parseResponseFormat(params, choice.message.content) : null
      }
    };
  });
  return { ...completion, choices };
}
function parseResponseFormat(params, content) {
  if (params.response_format?.type !== "json_schema") {
    return null;
  }
  if (params.response_format?.type === "json_schema") {
    if ("$parseRaw" in params.response_format) {
      const response_format = params.response_format;
      return response_format.$parseRaw(content);
    }
    return JSON.parse(content);
  }
  return null;
}
function parseToolCall(params, toolCall) {
  const inputTool = params.tools?.find((inputTool2) => isChatCompletionFunctionTool(inputTool2) && inputTool2.function?.name === toolCall.function.name);
  return {
    ...toolCall,
    function: {
      ...toolCall.function,
      parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCall.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCall.function.arguments) : null
    }
  };
}
function shouldParseToolCall(params, toolCall) {
  if (!params || !("tools" in params) || !params.tools) {
    return false;
  }
  const inputTool = params.tools?.find((inputTool2) => isChatCompletionFunctionTool(inputTool2) && inputTool2.function?.name === toolCall.function.name);
  return isChatCompletionFunctionTool(inputTool) && (isAutoParsableTool(inputTool) || inputTool?.function.strict || false);
}
function hasAutoParseableInput(params) {
  if (isAutoParsableResponseFormat(params.response_format)) {
    return true;
  }
  return params.tools?.some((t) => isAutoParsableTool(t) || t.type === "function" && t.function.strict === true) ?? false;
}
function assertToolCallsAreChatCompletionFunctionToolCalls(toolCalls) {
  for (const toolCall of toolCalls || []) {
    if (toolCall.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool calls are supported; Received \`${toolCall.type}\``);
    }
  }
}
function validateInputTools(tools) {
  for (const tool of tools ?? []) {
    if (tool.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
    }
    if (tool.function.strict !== true) {
      throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
    }
  }
}

// node_modules/openai/lib/chatCompletionUtils.mjs
var isAssistantMessage = (message) => {
  return message?.role === "assistant";
};
var isToolMessage = (message) => {
  return message?.role === "tool";
};

// node_modules/openai/lib/EventStream.mjs
var _EventStream_instances;
var _EventStream_connectedPromise;
var _EventStream_resolveConnectedPromise;
var _EventStream_rejectConnectedPromise;
var _EventStream_endPromise;
var _EventStream_resolveEndPromise;
var _EventStream_rejectEndPromise;
var _EventStream_listeners;
var _EventStream_ended;
var _EventStream_errored;
var _EventStream_aborted;
var _EventStream_catchingPromiseCreated;
var _EventStream_handleError;
var EventStream = class {
  constructor() {
    _EventStream_instances.add(this);
    this.controller = new AbortController();
    _EventStream_connectedPromise.set(this, void 0);
    _EventStream_resolveConnectedPromise.set(this, () => {
    });
    _EventStream_rejectConnectedPromise.set(this, () => {
    });
    _EventStream_endPromise.set(this, void 0);
    _EventStream_resolveEndPromise.set(this, () => {
    });
    _EventStream_rejectEndPromise.set(this, () => {
    });
    _EventStream_listeners.set(this, {});
    _EventStream_ended.set(this, false);
    _EventStream_errored.set(this, false);
    _EventStream_aborted.set(this, false);
    _EventStream_catchingPromiseCreated.set(this, false);
    __classPrivateFieldSet(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _EventStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet(this, _EventStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet(this, _EventStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _EventStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet(this, _EventStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet(this, _EventStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet(this, _EventStream_endPromise, "f").catch(() => {
    });
  }
  _run(executor) {
    setTimeout(() => {
      executor().then(() => {
        this._emitFinal();
        this._emit("end");
      }, __classPrivateFieldGet(this, _EventStream_instances, "m", _EventStream_handleError).bind(this));
    }, 0);
  }
  _connected() {
    if (this.ended)
      return;
    __classPrivateFieldGet(this, _EventStream_resolveConnectedPromise, "f").call(this);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet(this, _EventStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet(this, _EventStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet(this, _EventStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet(this, _EventStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet(this, _EventStream_endPromise, "f");
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet(this, _EventStream_ended, "f")) {
      return;
    }
    if (event === "end") {
      __classPrivateFieldSet(this, _EventStream_ended, true, "f");
      __classPrivateFieldGet(this, _EventStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet(this, _EventStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet(this, _EventStream_catchingPromiseCreated, "f") && !listeners?.length) {
        Promise.reject(error);
      }
      __classPrivateFieldGet(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
  }
};
_EventStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_endPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_listeners = /* @__PURE__ */ new WeakMap(), _EventStream_ended = /* @__PURE__ */ new WeakMap(), _EventStream_errored = /* @__PURE__ */ new WeakMap(), _EventStream_aborted = /* @__PURE__ */ new WeakMap(), _EventStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _EventStream_instances = /* @__PURE__ */ new WeakSet(), _EventStream_handleError = function _EventStream_handleError2(error) {
  __classPrivateFieldSet(this, _EventStream_errored, true, "f");
  if (error instanceof Error && error.name === "AbortError") {
    error = new APIUserAbortError();
  }
  if (error instanceof APIUserAbortError) {
    __classPrivateFieldSet(this, _EventStream_aborted, true, "f");
    return this._emit("abort", error);
  }
  if (error instanceof OpenAIError) {
    return this._emit("error", error);
  }
  if (error instanceof Error) {
    const openAIError = new OpenAIError(error.message);
    openAIError.cause = error;
    return this._emit("error", openAIError);
  }
  return this._emit("error", new OpenAIError(String(error)));
};

// node_modules/openai/lib/RunnableFunction.mjs
function isRunnableFunctionWithParse(fn) {
  return typeof fn.parse === "function";
}

// node_modules/openai/lib/AbstractChatCompletionRunner.mjs
var _AbstractChatCompletionRunner_instances;
var _AbstractChatCompletionRunner_getFinalContent;
var _AbstractChatCompletionRunner_getFinalMessage;
var _AbstractChatCompletionRunner_getFinalFunctionToolCall;
var _AbstractChatCompletionRunner_getFinalFunctionToolCallResult;
var _AbstractChatCompletionRunner_calculateTotalUsage;
var _AbstractChatCompletionRunner_validateParams;
var _AbstractChatCompletionRunner_stringifyFunctionCallResult;
var DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class extends EventStream {
  constructor() {
    super(...arguments);
    _AbstractChatCompletionRunner_instances.add(this);
    this._chatCompletions = [];
    this.messages = [];
  }
  _addChatCompletion(chatCompletion) {
    this._chatCompletions.push(chatCompletion);
    this._emit("chatCompletion", chatCompletion);
    const message = chatCompletion.choices[0]?.message;
    if (message)
      this._addMessage(message);
    return chatCompletion;
  }
  _addMessage(message, emit2 = true) {
    if (!("content" in message))
      message.content = null;
    this.messages.push(message);
    if (emit2) {
      this._emit("message", message);
      if (isToolMessage(message) && message.content) {
        this._emit("functionToolCallResult", message.content);
      } else if (isAssistantMessage(message) && message.tool_calls) {
        for (const tool_call of message.tool_calls) {
          if (tool_call.type === "function") {
            this._emit("functionToolCall", tool_call.function);
          }
        }
      }
    }
  }
  /**
   * @returns a promise that resolves with the final ChatCompletion, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
   */
  async finalChatCompletion() {
    await this.done();
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (!completion)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return completion;
  }
  /**
   * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalContent() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
   * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the content of the final FunctionCall, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalFunctionToolCall() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
  }
  async finalFunctionToolCallResult() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
  }
  async totalUsage() {
    await this.done();
    return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
  }
  allChatCompletions() {
    return [...this._chatCompletions];
  }
  _emitFinal() {
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (completion)
      this._emit("finalChatCompletion", completion);
    const finalMessage = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
    if (finalMessage)
      this._emit("finalMessage", finalMessage);
    const finalContent = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
    if (finalContent)
      this._emit("finalContent", finalContent);
    const finalFunctionCall = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCall).call(this);
    if (finalFunctionCall)
      this._emit("finalFunctionToolCall", finalFunctionCall);
    const finalFunctionCallResult = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionToolCallResult).call(this);
    if (finalFunctionCallResult != null)
      this._emit("finalFunctionToolCallResult", finalFunctionCallResult);
    if (this._chatCompletions.some((c) => c.usage)) {
      this._emit("totalUsage", __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
    }
  }
  async _createChatCompletion(client, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
    const chatCompletion = await client.chat.completions.create({ ...params, stream: false }, { ...options, signal: this.controller.signal });
    this._connected();
    return this._addChatCompletion(parseChatCompletion(chatCompletion, params));
  }
  async _runChatCompletion(client, params, options) {
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    return await this._createChatCompletion(client, params, options);
  }
  async _runTools(client, params, options) {
    const role = "tool";
    const { tool_choice = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof tool_choice !== "string" && tool_choice.type === "function" && tool_choice?.function?.name;
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const inputTools = params.tools.map((tool) => {
      if (isAutoParsableTool(tool)) {
        if (!tool.$callback) {
          throw new OpenAIError("Tool given to `.runTools()` that does not have an associated function");
        }
        return {
          type: "function",
          function: {
            function: tool.$callback,
            name: tool.function.name,
            description: tool.function.description || "",
            parameters: tool.function.parameters,
            parse: tool.$parseRaw,
            strict: true
          }
        };
      }
      return tool;
    });
    const functionsByName = {};
    for (const f of inputTools) {
      if (f.type === "function") {
        functionsByName[f.function.name || f.function.function.name] = f.function;
      }
    }
    const tools = "tools" in params ? inputTools.map((t) => t.type === "function" ? {
      type: "function",
      function: {
        name: t.function.name || t.function.function.name,
        parameters: t.function.parameters,
        description: t.function.description,
        strict: t.function.strict
      }
    } : t) : void 0;
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(client, {
        ...restParams,
        tool_choice,
        tools,
        messages: [...this.messages]
      }, options);
      const message = chatCompletion.choices[0]?.message;
      if (!message) {
        throw new OpenAIError(`missing message in ChatCompletion response`);
      }
      if (!message.tool_calls?.length) {
        return;
      }
      for (const tool_call of message.tool_calls) {
        if (tool_call.type !== "function")
          continue;
        const tool_call_id = tool_call.id;
        const { name, arguments: args } = tool_call.function;
        const fn = functionsByName[name];
        if (!fn) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName).map((name2) => JSON.stringify(name2)).join(", ")}. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        } else if (singleFunctionToCall && singleFunctionToCall !== name) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        let parsed;
        try {
          parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
        } catch (error) {
          const content2 = error instanceof Error ? error.message : String(error);
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        const rawContent = await fn.function(parsed, this);
        const content = __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
        this._addMessage({ role, tool_call_id, content });
        if (singleFunctionToCall) {
          return;
        }
      }
    }
    return;
  }
};
_AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent2() {
  return __classPrivateFieldGet(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage2() {
  let i = this.messages.length;
  while (i-- > 0) {
    const message = this.messages[i];
    if (isAssistantMessage(message)) {
      const ret = {
        ...message,
        content: message.content ?? null,
        refusal: message.refusal ?? null
      };
      return ret;
    }
  }
  throw new OpenAIError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, _AbstractChatCompletionRunner_getFinalFunctionToolCall = function _AbstractChatCompletionRunner_getFinalFunctionToolCall2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isAssistantMessage(message) && message?.tool_calls?.length) {
      return message.tool_calls.filter((x) => x.type === "function").at(-1)?.function;
    }
  }
  return;
}, _AbstractChatCompletionRunner_getFinalFunctionToolCallResult = function _AbstractChatCompletionRunner_getFinalFunctionToolCallResult2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isToolMessage(message) && message.content != null && typeof message.content === "string" && this.messages.some((x) => x.role === "assistant" && x.tool_calls?.some((y) => y.type === "function" && y.id === message.tool_call_id))) {
      return message.content;
    }
  }
  return;
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage2() {
  const total = {
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  };
  for (const { usage } of this._chatCompletions) {
    if (usage) {
      total.completion_tokens += usage.completion_tokens;
      total.prompt_tokens += usage.prompt_tokens;
      total.total_tokens += usage.total_tokens;
    }
  }
  return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams2(params) {
  if (params.n != null && params.n > 1) {
    throw new OpenAIError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
  }
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult2(rawContent) {
  return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
};

// node_modules/openai/lib/ChatCompletionRunner.mjs
var ChatCompletionRunner = class _ChatCompletionRunner extends AbstractChatCompletionRunner {
  static runTools(client, params, options) {
    const runner = new _ChatCompletionRunner();
    const opts = {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
  _addMessage(message, emit2 = true) {
    super._addMessage(message, emit2);
    if (isAssistantMessage(message) && message.content) {
      this._emit("content", message.content);
    }
  }
};

// node_modules/openai/_vendor/partial-json-parser/parser.mjs
var STR = 1;
var NUM = 2;
var ARR = 4;
var OBJ = 8;
var NULL = 16;
var BOOL = 32;
var NAN = 64;
var INFINITY = 128;
var MINUS_INFINITY = 256;
var INF = INFINITY | MINUS_INFINITY;
var SPECIAL = NULL | BOOL | INF | NAN;
var ATOM = STR | NUM | SPECIAL;
var COLLECTION = ARR | OBJ;
var ALL = ATOM | COLLECTION;
var Allow = {
  STR,
  NUM,
  ARR,
  OBJ,
  NULL,
  BOOL,
  NAN,
  INFINITY,
  MINUS_INFINITY,
  INF,
  SPECIAL,
  ATOM,
  COLLECTION,
  ALL
};
var PartialJSON = class extends Error {
};
var MalformedJSON = class extends Error {
};
function parseJSON(jsonString, allowPartial = Allow.ALL) {
  if (typeof jsonString !== "string") {
    throw new TypeError(`expecting str, got ${typeof jsonString}`);
  }
  if (!jsonString.trim()) {
    throw new Error(`${jsonString} is empty`);
  }
  return _parseJSON(jsonString.trim(), allowPartial);
}
var _parseJSON = (jsonString, allow) => {
  const length = jsonString.length;
  let index = 0;
  const markPartialJSON = (msg) => {
    throw new PartialJSON(`${msg} at position ${index}`);
  };
  const throwMalformedError = (msg) => {
    throw new MalformedJSON(`${msg} at position ${index}`);
  };
  const parseAny = () => {
    skipBlank();
    if (index >= length)
      markPartialJSON("Unexpected end of input");
    if (jsonString[index] === '"')
      return parseStr();
    if (jsonString[index] === "{")
      return parseObj();
    if (jsonString[index] === "[")
      return parseArr();
    if (jsonString.substring(index, index + 4) === "null" || Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
      index += 4;
      return null;
    }
    if (jsonString.substring(index, index + 4) === "true" || Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
      index += 4;
      return true;
    }
    if (jsonString.substring(index, index + 5) === "false" || Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
      index += 5;
      return false;
    }
    if (jsonString.substring(index, index + 8) === "Infinity" || Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
      index += 8;
      return Infinity;
    }
    if (jsonString.substring(index, index + 9) === "-Infinity" || Allow.MINUS_INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
      index += 9;
      return -Infinity;
    }
    if (jsonString.substring(index, index + 3) === "NaN" || Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
      index += 3;
      return NaN;
    }
    return parseNum();
  };
  const parseStr = () => {
    const start = index;
    let escape2 = false;
    index++;
    while (index < length && (jsonString[index] !== '"' || escape2 && jsonString[index - 1] === "\\")) {
      escape2 = jsonString[index] === "\\" ? !escape2 : false;
      index++;
    }
    if (jsonString.charAt(index) == '"') {
      try {
        return JSON.parse(jsonString.substring(start, ++index - Number(escape2)));
      } catch (e) {
        throwMalformedError(String(e));
      }
    } else if (Allow.STR & allow) {
      try {
        return JSON.parse(jsonString.substring(start, index - Number(escape2)) + '"');
      } catch (e) {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + '"');
      }
    }
    markPartialJSON("Unterminated string literal");
  };
  const parseObj = () => {
    index++;
    skipBlank();
    const obj = {};
    try {
      while (jsonString[index] !== "}") {
        skipBlank();
        if (index >= length && Allow.OBJ & allow)
          return obj;
        const key = parseStr();
        skipBlank();
        index++;
        try {
          const value = parseAny();
          Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
        } catch (e) {
          if (Allow.OBJ & allow)
            return obj;
          else
            throw e;
        }
        skipBlank();
        if (jsonString[index] === ",")
          index++;
      }
    } catch (e) {
      if (Allow.OBJ & allow)
        return obj;
      else
        markPartialJSON("Expected '}' at end of object");
    }
    index++;
    return obj;
  };
  const parseArr = () => {
    index++;
    const arr = [];
    try {
      while (jsonString[index] !== "]") {
        arr.push(parseAny());
        skipBlank();
        if (jsonString[index] === ",") {
          index++;
        }
      }
    } catch (e) {
      if (Allow.ARR & allow) {
        return arr;
      }
      markPartialJSON("Expected ']' at end of array");
    }
    index++;
    return arr;
  };
  const parseNum = () => {
    if (index === 0) {
      if (jsonString === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        if (Allow.NUM & allow) {
          try {
            if ("." === jsonString[jsonString.length - 1])
              return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf(".")));
            return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
          } catch (e2) {
          }
        }
        throwMalformedError(String(e));
      }
    }
    const start = index;
    if (jsonString[index] === "-")
      index++;
    while (jsonString[index] && !",]}".includes(jsonString[index]))
      index++;
    if (index == length && !(Allow.NUM & allow))
      markPartialJSON("Unterminated number literal");
    try {
      return JSON.parse(jsonString.substring(start, index));
    } catch (e) {
      if (jsonString.substring(start, index) === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
      } catch (e2) {
        throwMalformedError(String(e2));
      }
    }
  };
  const skipBlank = () => {
    while (index < length && " \n\r	".includes(jsonString[index])) {
      index++;
    }
  };
  return parseAny();
};
var partialParse = (input) => parseJSON(input, Allow.ALL ^ Allow.NUM);

// node_modules/openai/lib/ChatCompletionStream.mjs
var _ChatCompletionStream_instances;
var _ChatCompletionStream_params;
var _ChatCompletionStream_choiceEventStates;
var _ChatCompletionStream_currentChatCompletionSnapshot;
var _ChatCompletionStream_beginRequest;
var _ChatCompletionStream_getChoiceEventState;
var _ChatCompletionStream_addChunk;
var _ChatCompletionStream_emitToolCallDoneEvent;
var _ChatCompletionStream_emitContentDoneEvents;
var _ChatCompletionStream_endRequest;
var _ChatCompletionStream_getAutoParseableResponseFormat;
var _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class _ChatCompletionStream extends AbstractChatCompletionRunner {
  constructor(params) {
    super();
    _ChatCompletionStream_instances.add(this);
    _ChatCompletionStream_params.set(this, void 0);
    _ChatCompletionStream_choiceEventStates.set(this, void 0);
    _ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
    __classPrivateFieldSet(this, _ChatCompletionStream_params, params, "f");
    __classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
  }
  get currentChatCompletionSnapshot() {
    return __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createChatCompletion(client, params, options) {
    const runner = new _ChatCompletionStream(params);
    runner._run(() => runner._runChatCompletion(client, { ...params, stream: true }, { ...options, headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  async _createChatCompletion(client, params, options) {
    super._createChatCompletion;
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    const stream = await client.chat.completions.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const chunk of stream) {
      __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    let chatId;
    for await (const chunk of stream) {
      if (chatId && chatId !== chunk.id) {
        this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
      }
      __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
      chatId = chunk.id;
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  [(_ChatCompletionStream_params = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_choiceEventStates = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
  }, _ChatCompletionStream_getChoiceEventState = function _ChatCompletionStream_getChoiceEventState2(choice) {
    let state = __classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
    if (state) {
      return state;
    }
    state = {
      content_done: false,
      refusal_done: false,
      logprobs_content_done: false,
      logprobs_refusal_done: false,
      done_tool_calls: /* @__PURE__ */ new Set(),
      current_tool_call_index: null
    };
    __classPrivateFieldGet(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
    return state;
  }, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk2(chunk) {
    if (this.ended)
      return;
    const completion = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
    this._emit("chunk", chunk, completion);
    for (const choice of chunk.choices) {
      const choiceSnapshot = completion.choices[choice.index];
      if (choice.delta.content != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.content) {
        this._emit("content", choice.delta.content, choiceSnapshot.message.content);
        this._emit("content.delta", {
          delta: choice.delta.content,
          snapshot: choiceSnapshot.message.content,
          parsed: choiceSnapshot.message.parsed
        });
      }
      if (choice.delta.refusal != null && choiceSnapshot.message?.role === "assistant" && choiceSnapshot.message?.refusal) {
        this._emit("refusal.delta", {
          delta: choice.delta.refusal,
          snapshot: choiceSnapshot.message.refusal
        });
      }
      if (choice.logprobs?.content != null && choiceSnapshot.message?.role === "assistant") {
        this._emit("logprobs.content.delta", {
          content: choice.logprobs?.content,
          snapshot: choiceSnapshot.logprobs?.content ?? []
        });
      }
      if (choice.logprobs?.refusal != null && choiceSnapshot.message?.role === "assistant") {
        this._emit("logprobs.refusal.delta", {
          refusal: choice.logprobs?.refusal,
          snapshot: choiceSnapshot.logprobs?.refusal ?? []
        });
      }
      const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
      if (choiceSnapshot.finish_reason) {
        __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
        if (state.current_tool_call_index != null) {
          __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
        }
      }
      for (const toolCall of choice.delta.tool_calls ?? []) {
        if (state.current_tool_call_index !== toolCall.index) {
          __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
          if (state.current_tool_call_index != null) {
            __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
          }
        }
        state.current_tool_call_index = toolCall.index;
      }
      for (const toolCallDelta of choice.delta.tool_calls ?? []) {
        const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallDelta.index];
        if (!toolCallSnapshot?.type) {
          continue;
        }
        if (toolCallSnapshot?.type === "function") {
          this._emit("tool_calls.function.arguments.delta", {
            name: toolCallSnapshot.function?.name,
            index: toolCallDelta.index,
            arguments: toolCallSnapshot.function.arguments,
            parsed_arguments: toolCallSnapshot.function.parsed_arguments,
            arguments_delta: toolCallDelta.function?.arguments ?? ""
          });
        } else {
          assertNever(toolCallSnapshot?.type);
        }
      }
    }
  }, _ChatCompletionStream_emitToolCallDoneEvent = function _ChatCompletionStream_emitToolCallDoneEvent2(choiceSnapshot, toolCallIndex) {
    const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (state.done_tool_calls.has(toolCallIndex)) {
      return;
    }
    const toolCallSnapshot = choiceSnapshot.message.tool_calls?.[toolCallIndex];
    if (!toolCallSnapshot) {
      throw new Error("no tool call snapshot");
    }
    if (!toolCallSnapshot.type) {
      throw new Error("tool call snapshot missing `type`");
    }
    if (toolCallSnapshot.type === "function") {
      const inputTool = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.tools?.find((tool) => isChatCompletionFunctionTool(tool) && tool.function.name === toolCallSnapshot.function.name);
      this._emit("tool_calls.function.arguments.done", {
        name: toolCallSnapshot.function.name,
        index: toolCallIndex,
        arguments: toolCallSnapshot.function.arguments,
        parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCallSnapshot.function.arguments) : inputTool?.function.strict ? JSON.parse(toolCallSnapshot.function.arguments) : null
      });
    } else {
      assertNever(toolCallSnapshot.type);
    }
  }, _ChatCompletionStream_emitContentDoneEvents = function _ChatCompletionStream_emitContentDoneEvents2(choiceSnapshot) {
    const state = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (choiceSnapshot.message.content && !state.content_done) {
      state.content_done = true;
      const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this);
      this._emit("content.done", {
        content: choiceSnapshot.message.content,
        parsed: responseFormat ? responseFormat.$parseRaw(choiceSnapshot.message.content) : null
      });
    }
    if (choiceSnapshot.message.refusal && !state.refusal_done) {
      state.refusal_done = true;
      this._emit("refusal.done", { refusal: choiceSnapshot.message.refusal });
    }
    if (choiceSnapshot.logprobs?.content && !state.logprobs_content_done) {
      state.logprobs_content_done = true;
      this._emit("logprobs.content.done", { content: choiceSnapshot.logprobs.content });
    }
    if (choiceSnapshot.logprobs?.refusal && !state.logprobs_refusal_done) {
      state.logprobs_refusal_done = true;
      this._emit("logprobs.refusal.done", { refusal: choiceSnapshot.logprobs.refusal });
    }
  }, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
    __classPrivateFieldSet(this, _ChatCompletionStream_choiceEventStates, [], "f");
    return finalizeChatCompletion(snapshot, __classPrivateFieldGet(this, _ChatCompletionStream_params, "f"));
  }, _ChatCompletionStream_getAutoParseableResponseFormat = function _ChatCompletionStream_getAutoParseableResponseFormat2() {
    const responseFormat = __classPrivateFieldGet(this, _ChatCompletionStream_params, "f")?.response_format;
    if (isAutoParsableResponseFormat(responseFormat)) {
      return responseFormat;
    }
    return null;
  }, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion2(chunk) {
    var _a3, _b, _c, _d;
    let snapshot = __classPrivateFieldGet(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    const { choices, ...rest } = chunk;
    if (!snapshot) {
      snapshot = __classPrivateFieldSet(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
        ...rest,
        choices: []
      }, "f");
    } else {
      Object.assign(snapshot, rest);
    }
    for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
      let choice = snapshot.choices[index];
      if (!choice) {
        choice = snapshot.choices[index] = { finish_reason, index, message: {}, logprobs, ...other };
      }
      if (logprobs) {
        if (!choice.logprobs) {
          choice.logprobs = Object.assign({}, logprobs);
        } else {
          const { content: content2, refusal: refusal2, ...rest3 } = logprobs;
          assertIsEmpty(rest3);
          Object.assign(choice.logprobs, rest3);
          if (content2) {
            (_a3 = choice.logprobs).content ?? (_a3.content = []);
            choice.logprobs.content.push(...content2);
          }
          if (refusal2) {
            (_b = choice.logprobs).refusal ?? (_b.refusal = []);
            choice.logprobs.refusal.push(...refusal2);
          }
        }
      }
      if (finish_reason) {
        choice.finish_reason = finish_reason;
        if (__classPrivateFieldGet(this, _ChatCompletionStream_params, "f") && hasAutoParseableInput(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"))) {
          if (finish_reason === "length") {
            throw new LengthFinishReasonError();
          }
          if (finish_reason === "content_filter") {
            throw new ContentFilterFinishReasonError();
          }
        }
      }
      Object.assign(choice, other);
      if (!delta)
        continue;
      const { content, refusal, function_call, role, tool_calls, ...rest2 } = delta;
      assertIsEmpty(rest2);
      Object.assign(choice.message, rest2);
      if (refusal) {
        choice.message.refusal = (choice.message.refusal || "") + refusal;
      }
      if (role)
        choice.message.role = role;
      if (function_call) {
        if (!choice.message.function_call) {
          choice.message.function_call = function_call;
        } else {
          if (function_call.name)
            choice.message.function_call.name = function_call.name;
          if (function_call.arguments) {
            (_c = choice.message.function_call).arguments ?? (_c.arguments = "");
            choice.message.function_call.arguments += function_call.arguments;
          }
        }
      }
      if (content) {
        choice.message.content = (choice.message.content || "") + content;
        if (!choice.message.refusal && __classPrivateFieldGet(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this)) {
          choice.message.parsed = partialParse(choice.message.content);
        }
      }
      if (tool_calls) {
        if (!choice.message.tool_calls)
          choice.message.tool_calls = [];
        for (const { index: index2, id, type, function: fn, ...rest3 } of tool_calls) {
          const tool_call = (_d = choice.message.tool_calls)[index2] ?? (_d[index2] = {});
          Object.assign(tool_call, rest3);
          if (id)
            tool_call.id = id;
          if (type)
            tool_call.type = type;
          if (fn)
            tool_call.function ?? (tool_call.function = { name: fn.name ?? "", arguments: "" });
          if (fn?.name)
            tool_call.function.name = fn.name;
          if (fn?.arguments) {
            tool_call.function.arguments += fn.arguments;
            if (shouldParseToolCall(__classPrivateFieldGet(this, _ChatCompletionStream_params, "f"), tool_call)) {
              tool_call.function.parsed_arguments = partialParse(tool_call.function.arguments);
            }
          }
        }
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("chunk", (chunk) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(chunk);
      } else {
        pushQueue.push(chunk);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function finalizeChatCompletion(snapshot, params) {
  const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
  const completion = {
    ...rest,
    id,
    choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
      if (!finish_reason) {
        throw new OpenAIError(`missing finish_reason for choice ${index}`);
      }
      const { content = null, function_call, tool_calls, ...messageRest } = message;
      const role = message.role;
      if (!role) {
        throw new OpenAIError(`missing role for choice ${index}`);
      }
      if (function_call) {
        const { arguments: args, name } = function_call;
        if (args == null) {
          throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
        }
        if (!name) {
          throw new OpenAIError(`missing function_call.name for choice ${index}`);
        }
        return {
          ...choiceRest,
          message: {
            content,
            function_call: { arguments: args, name },
            role,
            refusal: message.refusal ?? null
          },
          finish_reason,
          index,
          logprobs
        };
      }
      if (tool_calls) {
        return {
          ...choiceRest,
          index,
          finish_reason,
          logprobs,
          message: {
            ...messageRest,
            role,
            content,
            refusal: message.refusal ?? null,
            tool_calls: tool_calls.map((tool_call, i) => {
              const { function: fn, type, id: id2, ...toolRest } = tool_call;
              const { arguments: args, name, ...fnRest } = fn || {};
              if (id2 == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id
${str(snapshot)}`);
              }
              if (type == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type
${str(snapshot)}`);
              }
              if (name == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name
${str(snapshot)}`);
              }
              if (args == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments
${str(snapshot)}`);
              }
              return { ...toolRest, id: id2, type, function: { ...fnRest, name, arguments: args } };
            })
          }
        };
      }
      return {
        ...choiceRest,
        message: { ...messageRest, content, role, refusal: message.refusal ?? null },
        finish_reason,
        index,
        logprobs
      };
    }),
    created,
    model,
    object: "chat.completion",
    ...system_fingerprint ? { system_fingerprint } : {}
  };
  return maybeParseChatCompletion(completion, params);
}
function str(x) {
  return JSON.stringify(x);
}
function assertIsEmpty(obj) {
  return;
}
function assertNever(_x) {
}

// node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
var ChatCompletionStreamingRunner = class _ChatCompletionStreamingRunner extends ChatCompletionStream {
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStreamingRunner(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static runTools(client, params, options) {
    const runner = new _ChatCompletionStreamingRunner(
      // @ts-expect-error TODO these types are incompatible
      params
    );
    const opts = {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
};

// node_modules/openai/resources/chat/completions/completions.mjs
var Completions = class extends APIResource {
  constructor() {
    super(...arguments);
    this.messages = new Messages(this._client);
  }
  create(body, options) {
    return this._client.post("/chat/completions", { body, ...options, stream: body.stream ?? false });
  }
  /**
   * Get a stored chat completion. Only Chat Completions that have been created with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * const chatCompletion =
   *   await client.chat.completions.retrieve('completion_id');
   * ```
   */
  retrieve(completionID, options) {
    return this._client.get(path`/chat/completions/${completionID}`, options);
  }
  /**
   * Modify a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be modified. Currently, the only
   * supported modification is to update the `metadata` field.
   *
   * @example
   * ```ts
   * const chatCompletion = await client.chat.completions.update(
   *   'completion_id',
   *   { metadata: { foo: 'string' } },
   * );
   * ```
   */
  update(completionID, body, options) {
    return this._client.post(path`/chat/completions/${completionID}`, { body, ...options });
  }
  /**
   * List stored Chat Completions. Only Chat Completions that have been stored with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatCompletion of client.chat.completions.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/chat/completions", CursorPage, { query, ...options });
  }
  /**
   * Delete a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be deleted.
   *
   * @example
   * ```ts
   * const chatCompletionDeleted =
   *   await client.chat.completions.delete('completion_id');
   * ```
   */
  delete(completionID, options) {
    return this._client.delete(path`/chat/completions/${completionID}`, options);
  }
  parse(body, options) {
    validateInputTools(body.tools);
    return this._client.chat.completions.create(body, {
      ...options,
      headers: {
        ...options?.headers,
        "X-Stainless-Helper-Method": "chat.completions.parse"
      }
    })._thenUnwrap((completion) => parseChatCompletion(completion, body));
  }
  runTools(body, options) {
    if (body.stream) {
      return ChatCompletionStreamingRunner.runTools(this._client, body, options);
    }
    return ChatCompletionRunner.runTools(this._client, body, options);
  }
  /**
   * Creates a chat completion stream
   */
  stream(body, options) {
    return ChatCompletionStream.createChatCompletion(this._client, body, options);
  }
};
Completions.Messages = Messages;

// node_modules/openai/resources/chat/chat.mjs
var Chat = class extends APIResource {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this._client);
  }
};
Chat.Completions = Completions;

// node_modules/openai/internal/headers.mjs
var brand_privateNullableHeaders = /* @__PURE__ */ Symbol("brand.privateNullableHeaders");
function* iterateHeaders(headers) {
  if (!headers)
    return;
  if (brand_privateNullableHeaders in headers) {
    const { values, nulls } = headers;
    yield* values.entries();
    for (const name of nulls) {
      yield [name, null];
    }
    return;
  }
  let shouldClear = false;
  let iter;
  if (headers instanceof Headers) {
    iter = headers.entries();
  } else if (isReadonlyArray(headers)) {
    iter = headers;
  } else {
    shouldClear = true;
    iter = Object.entries(headers ?? {});
  }
  for (let row of iter) {
    const name = row[0];
    if (typeof name !== "string")
      throw new TypeError("expected header name to be a string");
    const values = isReadonlyArray(row[1]) ? row[1] : [row[1]];
    let didClear = false;
    for (const value of values) {
      if (value === void 0)
        continue;
      if (shouldClear && !didClear) {
        didClear = true;
        yield [name, null];
      }
      yield [name, value];
    }
  }
}
var buildHeaders = (newHeaders) => {
  const targetHeaders = new Headers();
  const nullHeaders = /* @__PURE__ */ new Set();
  for (const headers of newHeaders) {
    const seenHeaders = /* @__PURE__ */ new Set();
    for (const [name, value] of iterateHeaders(headers)) {
      const lowerName = name.toLowerCase();
      if (!seenHeaders.has(lowerName)) {
        targetHeaders.delete(name);
        seenHeaders.add(lowerName);
      }
      if (value === null) {
        targetHeaders.delete(name);
        nullHeaders.add(lowerName);
      } else {
        targetHeaders.append(name, value);
        nullHeaders.delete(lowerName);
      }
    }
  }
  return { [brand_privateNullableHeaders]: true, values: targetHeaders, nulls: nullHeaders };
};

// node_modules/openai/resources/audio/speech.mjs
var Speech = class extends APIResource {
  /**
   * Generates audio from the input text.
   *
   * Returns the audio file content, or a stream of audio events.
   *
   * @example
   * ```ts
   * const speech = await client.audio.speech.create({
   *   input: 'input',
   *   model: 'tts-1',
   *   voice: 'alloy',
   * });
   *
   * const content = await speech.blob();
   * console.log(content);
   * ```
   */
  create(body, options) {
    return this._client.post("/audio/speech", {
      body,
      ...options,
      headers: buildHeaders([{ Accept: "application/octet-stream" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/audio/transcriptions.mjs
var Transcriptions = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/transcriptions", multipartFormRequestOptions({
      body,
      ...options,
      stream: body.stream ?? false,
      __metadata: { model: body.model }
    }, this._client));
  }
};

// node_modules/openai/resources/audio/translations.mjs
var Translations = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/translations", multipartFormRequestOptions({ body, ...options, __metadata: { model: body.model } }, this._client));
  }
};

// node_modules/openai/resources/audio/audio.mjs
var Audio = class extends APIResource {
  constructor() {
    super(...arguments);
    this.transcriptions = new Transcriptions(this._client);
    this.translations = new Translations(this._client);
    this.speech = new Speech(this._client);
  }
};
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;

// node_modules/openai/resources/batches.mjs
var Batches = class extends APIResource {
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(body, options) {
    return this._client.post("/batches", { body, ...options });
  }
  /**
   * Retrieves a batch.
   */
  retrieve(batchID, options) {
    return this._client.get(path`/batches/${batchID}`, options);
  }
  /**
   * List your organization's batches.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/batches", CursorPage, { query, ...options });
  }
  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
   * 10 minutes, before changing to `cancelled`, where it will have partial results
   * (if any) available in the output file.
   */
  cancel(batchID, options) {
    return this._client.post(path`/batches/${batchID}/cancel`, options);
  }
};

// node_modules/openai/resources/beta/assistants.mjs
var Assistants = class extends APIResource {
  /**
   * Create an assistant with a model and instructions.
   *
   * @deprecated
   */
  create(body, options) {
    return this._client.post("/assistants", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves an assistant.
   *
   * @deprecated
   */
  retrieve(assistantID, options) {
    return this._client.get(path`/assistants/${assistantID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies an assistant.
   *
   * @deprecated
   */
  update(assistantID, body, options) {
    return this._client.post(path`/assistants/${assistantID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of assistants.
   *
   * @deprecated
   */
  list(query = {}, options) {
    return this._client.getAPIList("/assistants", CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete an assistant.
   *
   * @deprecated
   */
  delete(assistantID, options) {
    return this._client.delete(path`/assistants/${assistantID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/sessions.mjs
var Sessions = class extends APIResource {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API. Can be configured with the same session parameters as the
   * `session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const session =
   *   await client.beta.realtime.sessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/sessions", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/transcription-sessions.mjs
var TranscriptionSessions = class extends APIResource {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API specifically for realtime transcriptions. Can be configured with
   * the same session parameters as the `transcription_session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const transcriptionSession =
   *   await client.beta.realtime.transcriptionSessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/transcription_sessions", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/realtime/realtime.mjs
var Realtime = class extends APIResource {
  constructor() {
    super(...arguments);
    this.sessions = new Sessions(this._client);
    this.transcriptionSessions = new TranscriptionSessions(this._client);
  }
};
Realtime.Sessions = Sessions;
Realtime.TranscriptionSessions = TranscriptionSessions;

// node_modules/openai/resources/beta/chatkit/sessions.mjs
var Sessions2 = class extends APIResource {
  /**
   * Create a ChatKit session.
   *
   * @example
   * ```ts
   * const chatSession =
   *   await client.beta.chatkit.sessions.create({
   *     user: 'x',
   *     workflow: { id: 'id' },
   *   });
   * ```
   */
  create(body, options) {
    return this._client.post("/chatkit/sessions", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * Cancel an active ChatKit session and return its most recent metadata.
   *
   * Cancelling prevents new requests from using the issued client secret.
   *
   * @example
   * ```ts
   * const chatSession =
   *   await client.beta.chatkit.sessions.cancel('cksess_123');
   * ```
   */
  cancel(sessionID, options) {
    return this._client.post(path`/chatkit/sessions/${sessionID}/cancel`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/chatkit/threads.mjs
var Threads = class extends APIResource {
  /**
   * Retrieve a ChatKit thread by its identifier.
   *
   * @example
   * ```ts
   * const chatkitThread =
   *   await client.beta.chatkit.threads.retrieve('cthr_123');
   * ```
   */
  retrieve(threadID, options) {
    return this._client.get(path`/chatkit/threads/${threadID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * List ChatKit threads with optional pagination and user filters.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const chatkitThread of client.beta.chatkit.threads.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/chatkit/threads", ConversationCursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * Delete a ChatKit thread along with its items and stored attachments.
   *
   * @example
   * ```ts
   * const thread = await client.beta.chatkit.threads.delete(
   *   'cthr_123',
   * );
   * ```
   */
  delete(threadID, options) {
    return this._client.delete(path`/chatkit/threads/${threadID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers])
    });
  }
  /**
   * List items that belong to a ChatKit thread.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const thread of client.beta.chatkit.threads.listItems(
   *   'cthr_123',
   * )) {
   *   // ...
   * }
   * ```
   */
  listItems(threadID, query = {}, options) {
    return this._client.getAPIList(path`/chatkit/threads/${threadID}/items`, ConversationCursorPage, { query, ...options, headers: buildHeaders([{ "OpenAI-Beta": "chatkit_beta=v1" }, options?.headers]) });
  }
};

// node_modules/openai/resources/beta/chatkit/chatkit.mjs
var ChatKit = class extends APIResource {
  constructor() {
    super(...arguments);
    this.sessions = new Sessions2(this._client);
    this.threads = new Threads(this._client);
  }
};
ChatKit.Sessions = Sessions2;
ChatKit.Threads = Threads;

// node_modules/openai/resources/beta/threads/messages.mjs
var Messages2 = class extends APIResource {
  /**
   * Create a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(threadID, body, options) {
    return this._client.post(path`/threads/${threadID}/messages`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieve a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(messageID, params, options) {
    const { thread_id } = params;
    return this._client.get(path`/threads/${thread_id}/messages/${messageID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(messageID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path`/threads/${thread_id}/messages/${messageID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of messages for a given thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(threadID, query = {}, options) {
    return this._client.getAPIList(path`/threads/${threadID}/messages`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Deletes a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(messageID, params, options) {
    const { thread_id } = params;
    return this._client.delete(path`/threads/${thread_id}/messages/${messageID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/beta/threads/runs/steps.mjs
var Steps = class extends APIResource {
  /**
   * Retrieves a run step.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(stepID, params, options) {
    const { thread_id, run_id, ...query } = params;
    return this._client.get(path`/threads/${thread_id}/runs/${run_id}/steps/${stepID}`, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of run steps belonging to a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(runID, params, options) {
    const { thread_id, ...query } = params;
    return this._client.getAPIList(path`/threads/${thread_id}/runs/${runID}/steps`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};

// node_modules/openai/internal/utils/base64.mjs
var toFloat32Array = (base64Str) => {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64Str, "base64");
    return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
  } else {
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return Array.from(new Float32Array(bytes.buffer));
  }
};

// node_modules/openai/internal/utils/env.mjs
var readEnv = (env) => {
  if (typeof globalThis.process !== "undefined") {
    return globalThis.process.env?.[env]?.trim() || void 0;
  }
  if (typeof globalThis.Deno !== "undefined") {
    return globalThis.Deno.env?.get?.(env)?.trim() || void 0;
  }
  return void 0;
};

// node_modules/openai/lib/AssistantStream.mjs
var _AssistantStream_instances;
var _a;
var _AssistantStream_events;
var _AssistantStream_runStepSnapshots;
var _AssistantStream_messageSnapshots;
var _AssistantStream_messageSnapshot;
var _AssistantStream_finalRun;
var _AssistantStream_currentContentIndex;
var _AssistantStream_currentContent;
var _AssistantStream_currentToolCallIndex;
var _AssistantStream_currentToolCall;
var _AssistantStream_currentEvent;
var _AssistantStream_currentRunSnapshot;
var _AssistantStream_currentRunStepSnapshot;
var _AssistantStream_addEvent;
var _AssistantStream_endRequest;
var _AssistantStream_handleMessage;
var _AssistantStream_handleRunStep;
var _AssistantStream_handleEvent;
var _AssistantStream_accumulateRunStep;
var _AssistantStream_accumulateMessage;
var _AssistantStream_accumulateContent;
var _AssistantStream_handleRun;
var AssistantStream = class extends EventStream {
  constructor() {
    super(...arguments);
    _AssistantStream_instances.add(this);
    _AssistantStream_events.set(this, []);
    _AssistantStream_runStepSnapshots.set(this, {});
    _AssistantStream_messageSnapshots.set(this, {});
    _AssistantStream_messageSnapshot.set(this, void 0);
    _AssistantStream_finalRun.set(this, void 0);
    _AssistantStream_currentContentIndex.set(this, void 0);
    _AssistantStream_currentContent.set(this, void 0);
    _AssistantStream_currentToolCallIndex.set(this, void 0);
    _AssistantStream_currentToolCall.set(this, void 0);
    _AssistantStream_currentEvent.set(this, void 0);
    _AssistantStream_currentRunSnapshot.set(this, void 0);
    _AssistantStream_currentRunStepSnapshot.set(this, void 0);
  }
  [(_AssistantStream_events = /* @__PURE__ */ new WeakMap(), _AssistantStream_runStepSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_finalRun = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContentIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCallIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCall = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentEvent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunStepSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_instances = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  static fromReadableStream(stream) {
    const runner = new _a();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  async _fromReadableStream(readableStream, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
  static createToolAssistantStream(runId, runs, params, options) {
    const runner = new _a();
    runner._run(() => runner._runToolAssistantStream(runId, runs, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createToolAssistantStream(run, runId, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.submitToolOutputs(runId, body, {
      ...options,
      signal: this.controller.signal
    });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static createThreadAssistantStream(params, thread, options) {
    const runner = new _a();
    runner._run(() => runner._threadAssistantStream(params, thread, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  static createAssistantStream(threadId, runs, params, options) {
    const runner = new _a();
    runner._run(() => runner._runAssistantStream(threadId, runs, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  currentEvent() {
    return __classPrivateFieldGet(this, _AssistantStream_currentEvent, "f");
  }
  currentRun() {
    return __classPrivateFieldGet(this, _AssistantStream_currentRunSnapshot, "f");
  }
  currentMessageSnapshot() {
    return __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f");
  }
  currentRunStepSnapshot() {
    return __classPrivateFieldGet(this, _AssistantStream_currentRunStepSnapshot, "f");
  }
  async finalRunSteps() {
    await this.done();
    return Object.values(__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f"));
  }
  async finalMessages() {
    await this.done();
    return Object.values(__classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f"));
  }
  async finalRun() {
    await this.done();
    if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f"))
      throw Error("Final run was not received.");
    return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
  }
  async _createThreadAssistantStream(thread, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await thread.createAndRun(body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  async _createAssistantStream(run, threadId, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.create(threadId, body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static accumulateDelta(acc, delta) {
    for (const [key, deltaValue] of Object.entries(delta)) {
      if (!acc.hasOwnProperty(key)) {
        acc[key] = deltaValue;
        continue;
      }
      let accValue = acc[key];
      if (accValue === null || accValue === void 0) {
        acc[key] = deltaValue;
        continue;
      }
      if (key === "index" || key === "type") {
        acc[key] = deltaValue;
        continue;
      }
      if (typeof accValue === "string" && typeof deltaValue === "string") {
        accValue += deltaValue;
      } else if (typeof accValue === "number" && typeof deltaValue === "number") {
        accValue += deltaValue;
      } else if (isObj(accValue) && isObj(deltaValue)) {
        accValue = this.accumulateDelta(accValue, deltaValue);
      } else if (Array.isArray(accValue) && Array.isArray(deltaValue)) {
        if (accValue.every((x) => typeof x === "string" || typeof x === "number")) {
          accValue.push(...deltaValue);
          continue;
        }
        for (const deltaEntry of deltaValue) {
          if (!isObj(deltaEntry)) {
            throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
          }
          const index = deltaEntry["index"];
          if (index == null) {
            console.error(deltaEntry);
            throw new Error("Expected array delta entry to have an `index` property");
          }
          if (typeof index !== "number") {
            throw new Error(`Expected array delta entry \`index\` property to be a number but got ${index}`);
          }
          const accEntry = accValue[index];
          if (accEntry == null) {
            accValue.push(deltaEntry);
          } else {
            accValue[index] = this.accumulateDelta(accEntry, deltaEntry);
          }
        }
        continue;
      } else {
        throw Error(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accValue}`);
      }
      acc[key] = accValue;
    }
    return acc;
  }
  _addRun(run) {
    return run;
  }
  async _threadAssistantStream(params, thread, options) {
    return await this._createThreadAssistantStream(thread, params, options);
  }
  async _runAssistantStream(threadId, runs, params, options) {
    return await this._createAssistantStream(runs, threadId, params, options);
  }
  async _runToolAssistantStream(runId, runs, params, options) {
    return await this._createToolAssistantStream(runs, runId, params, options);
  }
};
_a = AssistantStream, _AssistantStream_addEvent = function _AssistantStream_addEvent2(event) {
  if (this.ended)
    return;
  __classPrivateFieldSet(this, _AssistantStream_currentEvent, event, "f");
  __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
  switch (event.event) {
    case "thread.created":
      break;
    case "thread.run.created":
    case "thread.run.queued":
    case "thread.run.in_progress":
    case "thread.run.requires_action":
    case "thread.run.completed":
    case "thread.run.incomplete":
    case "thread.run.failed":
    case "thread.run.cancelling":
    case "thread.run.cancelled":
    case "thread.run.expired":
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
      break;
    case "thread.run.step.created":
    case "thread.run.step.in_progress":
    case "thread.run.step.delta":
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
      break;
    case "thread.message.created":
    case "thread.message.in_progress":
    case "thread.message.delta":
    case "thread.message.completed":
    case "thread.message.incomplete":
      __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
      break;
    case "error":
      throw new Error("Encountered an error event in event processing - errors should be processed earlier");
    default:
      assertNever2(event);
  }
}, _AssistantStream_endRequest = function _AssistantStream_endRequest2() {
  if (this.ended) {
    throw new OpenAIError(`stream has ended, this shouldn't happen`);
  }
  if (!__classPrivateFieldGet(this, _AssistantStream_finalRun, "f"))
    throw Error("Final run has not been received");
  return __classPrivateFieldGet(this, _AssistantStream_finalRun, "f");
}, _AssistantStream_handleMessage = function _AssistantStream_handleMessage2(event) {
  const [accumulatedMessage, newContent] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
  __classPrivateFieldSet(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
  __classPrivateFieldGet(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
  for (const content of newContent) {
    const snapshotContent = accumulatedMessage.content[content.index];
    if (snapshotContent?.type == "text") {
      this._emit("textCreated", snapshotContent.text);
    }
  }
  switch (event.event) {
    case "thread.message.created":
      this._emit("messageCreated", event.data);
      break;
    case "thread.message.in_progress":
      break;
    case "thread.message.delta":
      this._emit("messageDelta", event.data.delta, accumulatedMessage);
      if (event.data.delta.content) {
        for (const content of event.data.delta.content) {
          if (content.type == "text" && content.text) {
            let textDelta = content.text;
            let snapshot = accumulatedMessage.content[content.index];
            if (snapshot && snapshot.type == "text") {
              this._emit("textDelta", textDelta, snapshot.text);
            } else {
              throw Error("The snapshot associated with this text delta is not text or missing");
            }
          }
          if (content.index != __classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")) {
            if (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f")) {
              switch (__classPrivateFieldGet(this, _AssistantStream_currentContent, "f").type) {
                case "text":
                  this._emit("textDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                  break;
                case "image_file":
                  this._emit("imageFileDone", __classPrivateFieldGet(this, _AssistantStream_currentContent, "f").image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
                  break;
              }
            }
            __classPrivateFieldSet(this, _AssistantStream_currentContentIndex, content.index, "f");
          }
          __classPrivateFieldSet(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
        }
      }
      break;
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f") !== void 0) {
        const currentContent = event.data.content[__classPrivateFieldGet(this, _AssistantStream_currentContentIndex, "f")];
        if (currentContent) {
          switch (currentContent.type) {
            case "image_file":
              this._emit("imageFileDone", currentContent.image_file, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
              break;
            case "text":
              this._emit("textDone", currentContent.text, __classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f"));
              break;
          }
        }
      }
      if (__classPrivateFieldGet(this, _AssistantStream_messageSnapshot, "f")) {
        this._emit("messageDone", event.data);
      }
      __classPrivateFieldSet(this, _AssistantStream_messageSnapshot, void 0, "f");
  }
}, _AssistantStream_handleRunStep = function _AssistantStream_handleRunStep2(event) {
  const accumulatedRunStep = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
  __classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
  switch (event.event) {
    case "thread.run.step.created":
      this._emit("runStepCreated", event.data);
      break;
    case "thread.run.step.delta":
      const delta = event.data.delta;
      if (delta.step_details && delta.step_details.type == "tool_calls" && delta.step_details.tool_calls && accumulatedRunStep.step_details.type == "tool_calls") {
        for (const toolCall of delta.step_details.tool_calls) {
          if (toolCall.index == __classPrivateFieldGet(this, _AssistantStream_currentToolCallIndex, "f")) {
            this._emit("toolCallDelta", toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
          } else {
            if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
              this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
            }
            __classPrivateFieldSet(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
            __classPrivateFieldSet(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
            if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"))
              this._emit("toolCallCreated", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
          }
        }
      }
      this._emit("runStepDelta", event.data.delta, accumulatedRunStep);
      break;
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldSet(this, _AssistantStream_currentRunStepSnapshot, void 0, "f");
      const details = event.data.step_details;
      if (details.type == "tool_calls") {
        if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
          this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
          __classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
        }
      }
      this._emit("runStepDone", event.data, accumulatedRunStep);
      break;
    case "thread.run.step.in_progress":
      break;
  }
}, _AssistantStream_handleEvent = function _AssistantStream_handleEvent2(event) {
  __classPrivateFieldGet(this, _AssistantStream_events, "f").push(event);
  this._emit("event", event);
}, _AssistantStream_accumulateRunStep = function _AssistantStream_accumulateRunStep2(event) {
  switch (event.event) {
    case "thread.run.step.created":
      __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      return event.data;
    case "thread.run.step.delta":
      let snapshot = __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
      if (!snapshot) {
        throw Error("Received a RunStepDelta before creation of a snapshot");
      }
      let data = event.data;
      if (data.delta) {
        const accumulated = _a.accumulateDelta(snapshot, data.delta);
        __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
      }
      return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
    case "thread.run.step.in_progress":
      __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      break;
  }
  if (__classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id])
    return __classPrivateFieldGet(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
  throw new Error("No snapshot available");
}, _AssistantStream_accumulateMessage = function _AssistantStream_accumulateMessage2(event, snapshot) {
  let newContent = [];
  switch (event.event) {
    case "thread.message.created":
      return [event.data, newContent];
    case "thread.message.delta":
      if (!snapshot) {
        throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
      }
      let data = event.data;
      if (data.delta.content) {
        for (const contentElement of data.delta.content) {
          if (contentElement.index in snapshot.content) {
            let currentContent = snapshot.content[contentElement.index];
            snapshot.content[contentElement.index] = __classPrivateFieldGet(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent);
          } else {
            snapshot.content[contentElement.index] = contentElement;
            newContent.push(contentElement);
          }
        }
      }
      return [snapshot, newContent];
    case "thread.message.in_progress":
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (snapshot) {
        return [snapshot, newContent];
      } else {
        throw Error("Received thread message event with no existing snapshot");
      }
  }
  throw Error("Tried to accumulate a non-message event");
}, _AssistantStream_accumulateContent = function _AssistantStream_accumulateContent2(contentElement, currentContent) {
  return _a.accumulateDelta(currentContent, contentElement);
}, _AssistantStream_handleRun = function _AssistantStream_handleRun2(event) {
  __classPrivateFieldSet(this, _AssistantStream_currentRunSnapshot, event.data, "f");
  switch (event.event) {
    case "thread.run.created":
      break;
    case "thread.run.queued":
      break;
    case "thread.run.in_progress":
      break;
    case "thread.run.requires_action":
    case "thread.run.cancelled":
    case "thread.run.failed":
    case "thread.run.completed":
    case "thread.run.expired":
    case "thread.run.incomplete":
      __classPrivateFieldSet(this, _AssistantStream_finalRun, event.data, "f");
      if (__classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f")) {
        this._emit("toolCallDone", __classPrivateFieldGet(this, _AssistantStream_currentToolCall, "f"));
        __classPrivateFieldSet(this, _AssistantStream_currentToolCall, void 0, "f");
      }
      break;
    case "thread.run.cancelling":
      break;
  }
};
function assertNever2(_x) {
}

// node_modules/openai/resources/beta/threads/runs/runs.mjs
var Runs = class extends APIResource {
  constructor() {
    super(...arguments);
    this.steps = new Steps(this._client);
  }
  create(threadID, params, options) {
    const { include, ...body } = params;
    return this._client.post(path`/threads/${threadID}/runs`, {
      query: { include },
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: params.stream ?? false,
      __synthesizeEventData: true
    });
  }
  /**
   * Retrieves a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(runID, params, options) {
    const { thread_id } = params;
    return this._client.get(path`/threads/${thread_id}/runs/${runID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(runID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path`/threads/${thread_id}/runs/${runID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of runs belonging to a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  list(threadID, query = {}, options) {
    return this._client.getAPIList(path`/threads/${threadID}/runs`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Cancels a run that is `in_progress`.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  cancel(runID, params, options) {
    const { thread_id } = params;
    return this._client.post(path`/threads/${thread_id}/runs/${runID}/cancel`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * A helper to create a run an poll for a terminal state. More information on Run
   * lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndPoll(threadId, body, options) {
    const run = await this.create(threadId, body, options);
    return await this.poll(run.id, { thread_id: threadId }, options);
  }
  /**
   * Create a Run stream
   *
   * @deprecated use `stream` instead
   */
  createAndStream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  /**
   * A helper to poll a run status until it reaches a terminal state. More
   * information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async poll(runId, params, options) {
    const headers = buildHeaders([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const { data: run, response } = await this.retrieve(runId, params, {
        ...options,
        headers: { ...options?.headers, ...headers }
      }).withResponse();
      switch (run.status) {
        //If we are in any sort of intermediate state we poll
        case "queued":
        case "in_progress":
        case "cancelling":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        //We return the run in any terminal state.
        case "requires_action":
        case "incomplete":
        case "cancelled":
        case "completed":
        case "failed":
        case "expired":
          return run;
      }
    }
  }
  /**
   * Create a Run stream
   */
  stream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  submitToolOutputs(runID, params, options) {
    const { thread_id, ...body } = params;
    return this._client.post(path`/threads/${thread_id}/runs/${runID}/submit_tool_outputs`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: params.stream ?? false,
      __synthesizeEventData: true
    });
  }
  /**
   * A helper to submit a tool output to a run and poll for a terminal run state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async submitToolOutputsAndPoll(runId, params, options) {
    const run = await this.submitToolOutputs(runId, params, options);
    return await this.poll(run.id, params, options);
  }
  /**
   * Submit the tool outputs from a previous run and stream the run to a terminal
   * state. More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  submitToolOutputsStream(runId, params, options) {
    return AssistantStream.createToolAssistantStream(runId, this._client.beta.threads.runs, params, options);
  }
};
Runs.Steps = Steps;

// node_modules/openai/resources/beta/threads/threads.mjs
var Threads2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.runs = new Runs(this._client);
    this.messages = new Messages2(this._client);
  }
  /**
   * Create a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(body = {}, options) {
    return this._client.post("/threads", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadID, options) {
    return this._client.get(path`/threads/${threadID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(threadID, body, options) {
    return this._client.post(path`/threads/${threadID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  delete(threadID, options) {
    return this._client.delete(path`/threads/${threadID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  createAndRun(body, options) {
    return this._client.post("/threads/runs", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]),
      stream: body.stream ?? false,
      __synthesizeEventData: true
    });
  }
  /**
   * A helper to create a thread, start a run and then poll for a terminal state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndRunPoll(body, options) {
    const run = await this.createAndRun(body, options);
    return await this.runs.poll(run.id, { thread_id: run.thread_id }, options);
  }
  /**
   * Create a thread and stream the run back
   */
  createAndRunStream(body, options) {
    return AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
  }
};
Threads2.Runs = Runs;
Threads2.Messages = Messages2;

// node_modules/openai/resources/beta/beta.mjs
var Beta = class extends APIResource {
  constructor() {
    super(...arguments);
    this.realtime = new Realtime(this._client);
    this.chatkit = new ChatKit(this._client);
    this.assistants = new Assistants(this._client);
    this.threads = new Threads2(this._client);
  }
};
Beta.Realtime = Realtime;
Beta.ChatKit = ChatKit;
Beta.Assistants = Assistants;
Beta.Threads = Threads2;

// node_modules/openai/resources/completions.mjs
var Completions2 = class extends APIResource {
  create(body, options) {
    return this._client.post("/completions", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/openai/resources/containers/files/content.mjs
var Content = class extends APIResource {
  /**
   * Retrieve Container File Content
   */
  retrieve(fileID, params, options) {
    const { container_id } = params;
    return this._client.get(path`/containers/${container_id}/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/containers/files/files.mjs
var Files = class extends APIResource {
  constructor() {
    super(...arguments);
    this.content = new Content(this._client);
  }
  /**
   * Create a Container File
   *
   * You can send either a multipart/form-data request with the raw file content, or
   * a JSON request with a file ID.
   */
  create(containerID, body, options) {
    return this._client.post(path`/containers/${containerID}/files`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Retrieve Container File
   */
  retrieve(fileID, params, options) {
    const { container_id } = params;
    return this._client.get(path`/containers/${container_id}/files/${fileID}`, options);
  }
  /**
   * List Container files
   */
  list(containerID, query = {}, options) {
    return this._client.getAPIList(path`/containers/${containerID}/files`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete Container File
   */
  delete(fileID, params, options) {
    const { container_id } = params;
    return this._client.delete(path`/containers/${container_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
};
Files.Content = Content;

// node_modules/openai/resources/containers/containers.mjs
var Containers = class extends APIResource {
  constructor() {
    super(...arguments);
    this.files = new Files(this._client);
  }
  /**
   * Create Container
   */
  create(body, options) {
    return this._client.post("/containers", { body, ...options });
  }
  /**
   * Retrieve Container
   */
  retrieve(containerID, options) {
    return this._client.get(path`/containers/${containerID}`, options);
  }
  /**
   * List Containers
   */
  list(query = {}, options) {
    return this._client.getAPIList("/containers", CursorPage, { query, ...options });
  }
  /**
   * Delete Container
   */
  delete(containerID, options) {
    return this._client.delete(path`/containers/${containerID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
};
Containers.Files = Files;

// node_modules/openai/resources/conversations/items.mjs
var Items = class extends APIResource {
  /**
   * Create items in a conversation with the given ID.
   */
  create(conversationID, params, options) {
    const { include, ...body } = params;
    return this._client.post(path`/conversations/${conversationID}/items`, {
      query: { include },
      body,
      ...options
    });
  }
  /**
   * Get a single item from a conversation with the given IDs.
   */
  retrieve(itemID, params, options) {
    const { conversation_id, ...query } = params;
    return this._client.get(path`/conversations/${conversation_id}/items/${itemID}`, { query, ...options });
  }
  /**
   * List all items for a conversation with the given ID.
   */
  list(conversationID, query = {}, options) {
    return this._client.getAPIList(path`/conversations/${conversationID}/items`, ConversationCursorPage, { query, ...options });
  }
  /**
   * Delete an item from a conversation with the given IDs.
   */
  delete(itemID, params, options) {
    const { conversation_id } = params;
    return this._client.delete(path`/conversations/${conversation_id}/items/${itemID}`, options);
  }
};

// node_modules/openai/resources/conversations/conversations.mjs
var Conversations = class extends APIResource {
  constructor() {
    super(...arguments);
    this.items = new Items(this._client);
  }
  /**
   * Create a conversation.
   */
  create(body = {}, options) {
    return this._client.post("/conversations", { body, ...options });
  }
  /**
   * Get a conversation
   */
  retrieve(conversationID, options) {
    return this._client.get(path`/conversations/${conversationID}`, options);
  }
  /**
   * Update a conversation
   */
  update(conversationID, body, options) {
    return this._client.post(path`/conversations/${conversationID}`, { body, ...options });
  }
  /**
   * Delete a conversation. Items in the conversation will not be deleted.
   */
  delete(conversationID, options) {
    return this._client.delete(path`/conversations/${conversationID}`, options);
  }
};
Conversations.Items = Items;

// node_modules/openai/resources/embeddings.mjs
var Embeddings = class extends APIResource {
  /**
   * Creates an embedding vector representing the input text.
   *
   * @example
   * ```ts
   * const createEmbeddingResponse =
   *   await client.embeddings.create({
   *     input: 'The quick brown fox jumped over the lazy dog',
   *     model: 'text-embedding-3-small',
   *   });
   * ```
   */
  create(body, options) {
    const hasUserProvidedEncodingFormat = !!body.encoding_format;
    let encoding_format = hasUserProvidedEncodingFormat ? body.encoding_format : "base64";
    if (hasUserProvidedEncodingFormat) {
      loggerFor(this._client).debug("embeddings/user defined encoding_format:", body.encoding_format);
    }
    const response = this._client.post("/embeddings", {
      body: {
        ...body,
        encoding_format
      },
      ...options
    });
    if (hasUserProvidedEncodingFormat) {
      return response;
    }
    loggerFor(this._client).debug("embeddings/decoding base64 embeddings from base64");
    return response._thenUnwrap((response2) => {
      if (response2 && response2.data) {
        response2.data.forEach((embeddingBase64Obj) => {
          const embeddingBase64Str = embeddingBase64Obj.embedding;
          embeddingBase64Obj.embedding = toFloat32Array(embeddingBase64Str);
        });
      }
      return response2;
    });
  }
};

// node_modules/openai/resources/evals/runs/output-items.mjs
var OutputItems = class extends APIResource {
  /**
   * Get an evaluation run output item by ID.
   */
  retrieve(outputItemID, params, options) {
    const { eval_id, run_id } = params;
    return this._client.get(path`/evals/${eval_id}/runs/${run_id}/output_items/${outputItemID}`, options);
  }
  /**
   * Get a list of output items for an evaluation run.
   */
  list(runID, params, options) {
    const { eval_id, ...query } = params;
    return this._client.getAPIList(path`/evals/${eval_id}/runs/${runID}/output_items`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/evals/runs/runs.mjs
var Runs2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.outputItems = new OutputItems(this._client);
  }
  /**
   * Kicks off a new run for a given evaluation, specifying the data source, and what
   * model configuration to use to test. The datasource will be validated against the
   * schema specified in the config of the evaluation.
   */
  create(evalID, body, options) {
    return this._client.post(path`/evals/${evalID}/runs`, { body, ...options });
  }
  /**
   * Get an evaluation run by ID.
   */
  retrieve(runID, params, options) {
    const { eval_id } = params;
    return this._client.get(path`/evals/${eval_id}/runs/${runID}`, options);
  }
  /**
   * Get a list of runs for an evaluation.
   */
  list(evalID, query = {}, options) {
    return this._client.getAPIList(path`/evals/${evalID}/runs`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete an eval run.
   */
  delete(runID, params, options) {
    const { eval_id } = params;
    return this._client.delete(path`/evals/${eval_id}/runs/${runID}`, options);
  }
  /**
   * Cancel an ongoing evaluation run.
   */
  cancel(runID, params, options) {
    const { eval_id } = params;
    return this._client.post(path`/evals/${eval_id}/runs/${runID}`, options);
  }
};
Runs2.OutputItems = OutputItems;

// node_modules/openai/resources/evals/evals.mjs
var Evals = class extends APIResource {
  constructor() {
    super(...arguments);
    this.runs = new Runs2(this._client);
  }
  /**
   * Create the structure of an evaluation that can be used to test a model's
   * performance. An evaluation is a set of testing criteria and the config for a
   * data source, which dictates the schema of the data used in the evaluation. After
   * creating an evaluation, you can run it on different models and model parameters.
   * We support several types of graders and datasources. For more information, see
   * the [Evals guide](https://platform.openai.com/docs/guides/evals).
   */
  create(body, options) {
    return this._client.post("/evals", { body, ...options });
  }
  /**
   * Get an evaluation by ID.
   */
  retrieve(evalID, options) {
    return this._client.get(path`/evals/${evalID}`, options);
  }
  /**
   * Update certain properties of an evaluation.
   */
  update(evalID, body, options) {
    return this._client.post(path`/evals/${evalID}`, { body, ...options });
  }
  /**
   * List evaluations for a project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/evals", CursorPage, { query, ...options });
  }
  /**
   * Delete an evaluation.
   */
  delete(evalID, options) {
    return this._client.delete(path`/evals/${evalID}`, options);
  }
};
Evals.Runs = Runs2;

// node_modules/openai/resources/files.mjs
var Files2 = class extends APIResource {
  /**
   * Upload a file that can be used across various endpoints. Individual files can be
   * up to 512 MB, and each project can store up to 2.5 TB of files in total. There
   * is no organization-wide storage limit.
   *
   * - The Assistants API supports files up to 2 million tokens and of specific file
   *   types. See the
   *   [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools)
   *   for details.
   * - The Fine-tuning API only supports `.jsonl` files. The input also has certain
   *   required formats for fine-tuning
   *   [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input)
   *   or
   *   [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
   *   models.
   * - The Batch API only supports `.jsonl` files up to 200 MB in size. The input
   *   also has a specific required
   *   [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  create(body, options) {
    return this._client.post("/files", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Returns information about a specific file.
   */
  retrieve(fileID, options) {
    return this._client.get(path`/files/${fileID}`, options);
  }
  /**
   * Returns a list of files.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/files", CursorPage, { query, ...options });
  }
  /**
   * Delete a file and remove it from all vector stores.
   */
  delete(fileID, options) {
    return this._client.delete(path`/files/${fileID}`, options);
  }
  /**
   * Returns the contents of the specified file.
   */
  content(fileID, options) {
    return this._client.get(path`/files/${fileID}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * Waits for the given file to be processed, default timeout is 30 mins.
   */
  async waitForProcessing(id, { pollInterval = 5e3, maxWait = 30 * 60 * 1e3 } = {}) {
    const TERMINAL_STATES = /* @__PURE__ */ new Set(["processed", "error", "deleted"]);
    const start = Date.now();
    let file = await this.retrieve(id);
    while (!file.status || !TERMINAL_STATES.has(file.status)) {
      await sleep(pollInterval);
      file = await this.retrieve(id);
      if (Date.now() - start > maxWait) {
        throw new APIConnectionTimeoutError({
          message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.`
        });
      }
    }
    return file;
  }
};

// node_modules/openai/resources/fine-tuning/methods.mjs
var Methods = class extends APIResource {
};

// node_modules/openai/resources/fine-tuning/alpha/graders.mjs
var Graders = class extends APIResource {
  /**
   * Run a grader.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.alpha.graders.run({
   *   grader: {
   *     input: 'input',
   *     name: 'name',
   *     operation: 'eq',
   *     reference: 'reference',
   *     type: 'string_check',
   *   },
   *   model_sample: 'model_sample',
   * });
   * ```
   */
  run(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/run", { body, ...options });
  }
  /**
   * Validate a grader.
   *
   * @example
   * ```ts
   * const response =
   *   await client.fineTuning.alpha.graders.validate({
   *     grader: {
   *       input: 'input',
   *       name: 'name',
   *       operation: 'eq',
   *       reference: 'reference',
   *       type: 'string_check',
   *     },
   *   });
   * ```
   */
  validate(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/validate", { body, ...options });
  }
};

// node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
var Alpha = class extends APIResource {
  constructor() {
    super(...arguments);
    this.graders = new Graders(this._client);
  }
};
Alpha.Graders = Graders;

// node_modules/openai/resources/fine-tuning/checkpoints/permissions.mjs
var Permissions = class extends APIResource {
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects
   * in their organization.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
   *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *   { project_ids: ['string'] },
   * )) {
   *   // ...
   * }
   * ```
   */
  create(fineTunedModelCheckpoint, body, options) {
    return this._client.getAPIList(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, Page, { body, method: "post", ...options });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @deprecated Retrieve is deprecated. Please swap to the paginated list method instead.
   */
  retrieve(fineTunedModelCheckpoint, query = {}, options) {
    return this._client.get(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
      query,
      ...options
    });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to view all permissions for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionListResponse of client.fineTuning.checkpoints.permissions.list(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(fineTunedModelCheckpoint, query = {}, options) {
    return this._client.getAPIList(path`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, ConversationCursorPage, { query, ...options });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.delete(
   *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
   *     {
   *       fine_tuned_model_checkpoint:
   *         'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *     },
   *   );
   * ```
   */
  delete(permissionID, params, options) {
    const { fine_tuned_model_checkpoint } = params;
    return this._client.delete(path`/fine_tuning/checkpoints/${fine_tuned_model_checkpoint}/permissions/${permissionID}`, options);
  }
};

// node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
var Checkpoints = class extends APIResource {
  constructor() {
    super(...arguments);
    this.permissions = new Permissions(this._client);
  }
};
Checkpoints.Permissions = Permissions;

// node_modules/openai/resources/fine-tuning/jobs/checkpoints.mjs
var Checkpoints2 = class extends APIResource {
  /**
   * List checkpoints for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobCheckpoint of client.fineTuning.jobs.checkpoints.list(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(fineTuningJobID, query = {}, options) {
    return this._client.getAPIList(path`/fine_tuning/jobs/${fineTuningJobID}/checkpoints`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
var Jobs = class extends APIResource {
  constructor() {
    super(...arguments);
    this.checkpoints = new Checkpoints2(this._client);
  }
  /**
   * Creates a fine-tuning job which begins the process of creating a new model from
   * a given dataset.
   *
   * Response includes details of the enqueued job including job status and the name
   * of the fine-tuned models once complete.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.create({
   *   model: 'gpt-4o-mini',
   *   training_file: 'file-abc123',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/fine_tuning/jobs", { body, ...options });
  }
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/model-optimization)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.retrieve(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  retrieve(fineTuningJobID, options) {
    return this._client.get(path`/fine_tuning/jobs/${fineTuningJobID}`, options);
  }
  /**
   * List your organization's fine-tuning jobs
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJob of client.fineTuning.jobs.list()) {
   *   // ...
   * }
   * ```
   */
  list(query = {}, options) {
    return this._client.getAPIList("/fine_tuning/jobs", CursorPage, { query, ...options });
  }
  /**
   * Immediately cancel a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.cancel(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  cancel(fineTuningJobID, options) {
    return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/cancel`, options);
  }
  /**
   * Get status updates for a fine-tuning job.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const fineTuningJobEvent of client.fineTuning.jobs.listEvents(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * )) {
   *   // ...
   * }
   * ```
   */
  listEvents(fineTuningJobID, query = {}, options) {
    return this._client.getAPIList(path`/fine_tuning/jobs/${fineTuningJobID}/events`, CursorPage, { query, ...options });
  }
  /**
   * Pause a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.pause(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  pause(fineTuningJobID, options) {
    return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/pause`, options);
  }
  /**
   * Resume a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.resume(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  resume(fineTuningJobID, options) {
    return this._client.post(path`/fine_tuning/jobs/${fineTuningJobID}/resume`, options);
  }
};
Jobs.Checkpoints = Checkpoints2;

// node_modules/openai/resources/fine-tuning/fine-tuning.mjs
var FineTuning = class extends APIResource {
  constructor() {
    super(...arguments);
    this.methods = new Methods(this._client);
    this.jobs = new Jobs(this._client);
    this.checkpoints = new Checkpoints(this._client);
    this.alpha = new Alpha(this._client);
  }
};
FineTuning.Methods = Methods;
FineTuning.Jobs = Jobs;
FineTuning.Checkpoints = Checkpoints;
FineTuning.Alpha = Alpha;

// node_modules/openai/resources/graders/grader-models.mjs
var GraderModels = class extends APIResource {
};

// node_modules/openai/resources/graders/graders.mjs
var Graders2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.graderModels = new GraderModels(this._client);
  }
};
Graders2.GraderModels = GraderModels;

// node_modules/openai/resources/images.mjs
var Images = class extends APIResource {
  /**
   * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.createVariation({
   *   image: fs.createReadStream('otter.png'),
   * });
   * ```
   */
  createVariation(body, options) {
    return this._client.post("/images/variations", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  edit(body, options) {
    return this._client.post("/images/edits", multipartFormRequestOptions({ body, ...options, stream: body.stream ?? false }, this._client));
  }
  generate(body, options) {
    return this._client.post("/images/generations", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/openai/resources/models.mjs
var Models = class extends APIResource {
  /**
   * Retrieves a model instance, providing basic information about the model such as
   * the owner and permissioning.
   */
  retrieve(model, options) {
    return this._client.get(path`/models/${model}`, options);
  }
  /**
   * Lists the currently available models, and provides basic information about each
   * one such as the owner and availability.
   */
  list(options) {
    return this._client.getAPIList("/models", Page, options);
  }
  /**
   * Delete a fine-tuned model. You must have the Owner role in your organization to
   * delete a model.
   */
  delete(model, options) {
    return this._client.delete(path`/models/${model}`, options);
  }
};

// node_modules/openai/resources/moderations.mjs
var Moderations = class extends APIResource {
  /**
   * Classifies if text and/or image inputs are potentially harmful. Learn more in
   * the [moderation guide](https://platform.openai.com/docs/guides/moderation).
   */
  create(body, options) {
    return this._client.post("/moderations", { body, ...options });
  }
};

// node_modules/openai/resources/realtime/calls.mjs
var Calls = class extends APIResource {
  /**
   * Accept an incoming SIP call and configure the realtime session that will handle
   * it.
   *
   * @example
   * ```ts
   * await client.realtime.calls.accept('call_id', {
   *   type: 'realtime',
   * });
   * ```
   */
  accept(callID, body, options) {
    return this._client.post(path`/realtime/calls/${callID}/accept`, {
      body,
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * End an active Realtime API call, whether it was initiated over SIP or WebRTC.
   *
   * @example
   * ```ts
   * await client.realtime.calls.hangup('call_id');
   * ```
   */
  hangup(callID, options) {
    return this._client.post(path`/realtime/calls/${callID}/hangup`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * Transfer an active SIP call to a new destination using the SIP REFER verb.
   *
   * @example
   * ```ts
   * await client.realtime.calls.refer('call_id', {
   *   target_uri: 'tel:+14155550123',
   * });
   * ```
   */
  refer(callID, body, options) {
    return this._client.post(path`/realtime/calls/${callID}/refer`, {
      body,
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
  /**
   * Decline an incoming SIP call by returning a SIP status code to the caller.
   *
   * @example
   * ```ts
   * await client.realtime.calls.reject('call_id');
   * ```
   */
  reject(callID, body = {}, options) {
    return this._client.post(path`/realtime/calls/${callID}/reject`, {
      body,
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
};

// node_modules/openai/resources/realtime/client-secrets.mjs
var ClientSecrets = class extends APIResource {
  /**
   * Create a Realtime client secret with an associated session configuration.
   *
   * Client secrets are short-lived tokens that can be passed to a client app, such
   * as a web frontend or mobile client, which grants access to the Realtime API
   * without leaking your main API key. You can configure a custom TTL for each
   * client secret.
   *
   * You can also attach session configuration options to the client secret, which
   * will be applied to any sessions created using that client secret, but these can
   * also be overridden by the client connection.
   *
   * [Learn more about authentication with client secrets over WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc).
   *
   * Returns the created client secret and the effective session object. The client
   * secret is a string that looks like `ek_1234`.
   *
   * @example
   * ```ts
   * const clientSecret =
   *   await client.realtime.clientSecrets.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/client_secrets", { body, ...options });
  }
};

// node_modules/openai/resources/realtime/realtime.mjs
var Realtime2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.clientSecrets = new ClientSecrets(this._client);
    this.calls = new Calls(this._client);
  }
};
Realtime2.ClientSecrets = ClientSecrets;
Realtime2.Calls = Calls;

// node_modules/openai/lib/ResponsesParser.mjs
function maybeParseResponse(response, params) {
  if (!params || !hasAutoParseableInput2(params)) {
    return {
      ...response,
      output_parsed: null,
      output: response.output.map((item) => {
        if (item.type === "function_call") {
          return {
            ...item,
            parsed_arguments: null
          };
        }
        if (item.type === "message") {
          return {
            ...item,
            content: item.content.map((content) => ({
              ...content,
              parsed: null
            }))
          };
        } else {
          return item;
        }
      })
    };
  }
  return parseResponse(response, params);
}
function parseResponse(response, params) {
  const output = response.output.map((item) => {
    if (item.type === "function_call") {
      return {
        ...item,
        parsed_arguments: parseToolCall2(params, item)
      };
    }
    if (item.type === "message") {
      const content = item.content.map((content2) => {
        if (content2.type === "output_text") {
          return {
            ...content2,
            parsed: parseTextFormat(params, content2.text)
          };
        }
        return content2;
      });
      return {
        ...item,
        content
      };
    }
    return item;
  });
  const parsed = Object.assign({}, response, { output });
  if (!Object.getOwnPropertyDescriptor(response, "output_text")) {
    addOutputText(parsed);
  }
  Object.defineProperty(parsed, "output_parsed", {
    enumerable: true,
    get() {
      for (const output2 of parsed.output) {
        if (output2.type !== "message") {
          continue;
        }
        for (const content of output2.content) {
          if (content.type === "output_text" && content.parsed !== null) {
            return content.parsed;
          }
        }
      }
      return null;
    }
  });
  return parsed;
}
function parseTextFormat(params, content) {
  if (params.text?.format?.type !== "json_schema") {
    return null;
  }
  if ("$parseRaw" in params.text?.format) {
    const text_format = params.text?.format;
    return text_format.$parseRaw(content);
  }
  return JSON.parse(content);
}
function hasAutoParseableInput2(params) {
  if (isAutoParsableResponseFormat(params.text?.format)) {
    return true;
  }
  return false;
}
function isAutoParsableTool2(tool) {
  return tool?.["$brand"] === "auto-parseable-tool";
}
function getInputToolByName(input_tools, name) {
  return input_tools.find((tool) => tool.type === "function" && tool.name === name);
}
function parseToolCall2(params, toolCall) {
  const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
  return {
    ...toolCall,
    ...toolCall,
    parsed_arguments: isAutoParsableTool2(inputTool) ? inputTool.$parseRaw(toolCall.arguments) : inputTool?.strict ? JSON.parse(toolCall.arguments) : null
  };
}
function addOutputText(rsp) {
  const texts = [];
  for (const output of rsp.output) {
    if (output.type !== "message") {
      continue;
    }
    for (const content of output.content) {
      if (content.type === "output_text") {
        texts.push(content.text);
      }
    }
  }
  rsp.output_text = texts.join("");
}

// node_modules/openai/lib/responses/ResponseStream.mjs
var _ResponseStream_instances;
var _ResponseStream_params;
var _ResponseStream_currentResponseSnapshot;
var _ResponseStream_finalResponse;
var _ResponseStream_beginRequest;
var _ResponseStream_addEvent;
var _ResponseStream_endRequest;
var _ResponseStream_accumulateResponse;
var ResponseStream = class _ResponseStream extends EventStream {
  constructor(params) {
    super();
    _ResponseStream_instances.add(this);
    _ResponseStream_params.set(this, void 0);
    _ResponseStream_currentResponseSnapshot.set(this, void 0);
    _ResponseStream_finalResponse.set(this, void 0);
    __classPrivateFieldSet(this, _ResponseStream_params, params, "f");
  }
  static createResponse(client, params, options) {
    const runner = new _ResponseStream(params);
    runner._run(() => runner._createOrRetrieveResponse(client, params, {
      ...options,
      headers: { ...options?.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createOrRetrieveResponse(client, params, options) {
    const signal = options?.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
    let stream;
    let starting_after = null;
    if ("response_id" in params) {
      stream = await client.responses.retrieve(params.response_id, { stream: true }, { ...options, signal: this.controller.signal, stream: true });
      starting_after = params.starting_after ?? null;
    } else {
      stream = await client.responses.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    }
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
    }
    if (stream.controller.signal?.aborted) {
      throw new APIUserAbortError();
    }
    return __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
  }
  [(_ResponseStream_params = /* @__PURE__ */ new WeakMap(), _ResponseStream_currentResponseSnapshot = /* @__PURE__ */ new WeakMap(), _ResponseStream_finalResponse = /* @__PURE__ */ new WeakMap(), _ResponseStream_instances = /* @__PURE__ */ new WeakSet(), _ResponseStream_beginRequest = function _ResponseStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
  }, _ResponseStream_addEvent = function _ResponseStream_addEvent2(event, starting_after) {
    if (this.ended)
      return;
    const maybeEmit = (name, event2) => {
      if (starting_after == null || event2.sequence_number > starting_after) {
        this._emit(name, event2);
      }
    };
    const response = __classPrivateFieldGet(this, _ResponseStream_instances, "m", _ResponseStream_accumulateResponse).call(this, event);
    maybeEmit("event", event);
    switch (event.type) {
      case "response.output_text.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          maybeEmit("response.output_text.delta", {
            ...event,
            snapshot: content.text
          });
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          maybeEmit("response.function_call_arguments.delta", {
            ...event,
            snapshot: output.arguments
          });
        }
        break;
      }
      default:
        maybeEmit(event.type, event);
        break;
    }
  }, _ResponseStream_endRequest = function _ResponseStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any events`);
    }
    __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
    const parsedResponse = finalizeResponse(snapshot, __classPrivateFieldGet(this, _ResponseStream_params, "f"));
    __classPrivateFieldSet(this, _ResponseStream_finalResponse, parsedResponse, "f");
    return parsedResponse;
  }, _ResponseStream_accumulateResponse = function _ResponseStream_accumulateResponse2(event) {
    let snapshot = __classPrivateFieldGet(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      if (event.type !== "response.created") {
        throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
      }
      snapshot = __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
      return snapshot;
    }
    switch (event.type) {
      case "response.output_item.added": {
        snapshot.output.push(event.item);
        break;
      }
      case "response.content_part.added": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        const type = output.type;
        const part = event.part;
        if (type === "message" && part.type !== "reasoning_text") {
          output.content.push(part);
        } else if (type === "reasoning" && part.type === "reasoning_text") {
          if (!output.content) {
            output.content = [];
          }
          output.content.push(part);
        }
        break;
      }
      case "response.output_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          output.arguments += event.delta;
        }
        break;
      }
      case "response.reasoning_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "reasoning") {
          const content = output.content?.[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "reasoning_text") {
            throw new OpenAIError(`expected content to be 'reasoning_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.completed": {
        __classPrivateFieldSet(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
        break;
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((event2) => event2 ? { value: event2, done: false } : { value: void 0, done: true });
        }
        const event = pushQueue.shift();
        return { value: event, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  /**
   * @returns a promise that resolves with the final Response, or rejects
   * if an error occurred or the stream ended prematurely without producing a REsponse.
   */
  async finalResponse() {
    await this.done();
    const response = __classPrivateFieldGet(this, _ResponseStream_finalResponse, "f");
    if (!response)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return response;
  }
};
function finalizeResponse(snapshot, params) {
  return maybeParseResponse(snapshot, params);
}

// node_modules/openai/resources/responses/input-items.mjs
var InputItems = class extends APIResource {
  /**
   * Returns a list of input items for a given response.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const responseItem of client.responses.inputItems.list(
   *   'response_id',
   * )) {
   *   // ...
   * }
   * ```
   */
  list(responseID, query = {}, options) {
    return this._client.getAPIList(path`/responses/${responseID}/input_items`, CursorPage, { query, ...options });
  }
};

// node_modules/openai/resources/responses/input-tokens.mjs
var InputTokens = class extends APIResource {
  /**
   * Returns input token counts of the request.
   *
   * Returns an object with `object` set to `response.input_tokens` and an
   * `input_tokens` count.
   *
   * @example
   * ```ts
   * const response = await client.responses.inputTokens.count();
   * ```
   */
  count(body = {}, options) {
    return this._client.post("/responses/input_tokens", { body, ...options });
  }
};

// node_modules/openai/resources/responses/responses.mjs
var Responses = class extends APIResource {
  constructor() {
    super(...arguments);
    this.inputItems = new InputItems(this._client);
    this.inputTokens = new InputTokens(this._client);
  }
  create(body, options) {
    return this._client.post("/responses", { body, ...options, stream: body.stream ?? false })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  retrieve(responseID, query = {}, options) {
    return this._client.get(path`/responses/${responseID}`, {
      query,
      ...options,
      stream: query?.stream ?? false
    })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  /**
   * Deletes a model response with the given ID.
   *
   * @example
   * ```ts
   * await client.responses.delete(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  delete(responseID, options) {
    return this._client.delete(path`/responses/${responseID}`, {
      ...options,
      headers: buildHeaders([{ Accept: "*/*" }, options?.headers])
    });
  }
  parse(body, options) {
    return this._client.responses.create(body, options)._thenUnwrap((response) => parseResponse(response, body));
  }
  /**
   * Creates a model response stream
   */
  stream(body, options) {
    return ResponseStream.createResponse(this._client, body, options);
  }
  /**
   * Cancels a model response with the given ID. Only responses created with the
   * `background` parameter set to `true` can be cancelled.
   * [Learn more](https://platform.openai.com/docs/guides/background).
   *
   * @example
   * ```ts
   * const response = await client.responses.cancel(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  cancel(responseID, options) {
    return this._client.post(path`/responses/${responseID}/cancel`, options);
  }
  /**
   * Compact a conversation. Returns a compacted response object.
   *
   * Learn when and how to compact long-running conversations in the
   * [conversation state guide](https://platform.openai.com/docs/guides/conversation-state#managing-the-context-window).
   * For ZDR-compatible compaction details, see
   * [Compaction (advanced)](https://platform.openai.com/docs/guides/conversation-state#compaction-advanced).
   *
   * @example
   * ```ts
   * const compactedResponse = await client.responses.compact({
   *   model: 'gpt-5.4',
   * });
   * ```
   */
  compact(body, options) {
    return this._client.post("/responses/compact", { body, ...options });
  }
};
Responses.InputItems = InputItems;
Responses.InputTokens = InputTokens;

// node_modules/openai/resources/skills/content.mjs
var Content2 = class extends APIResource {
  /**
   * Download a skill zip bundle by its ID.
   */
  retrieve(skillID, options) {
    return this._client.get(path`/skills/${skillID}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/skills/versions/content.mjs
var Content3 = class extends APIResource {
  /**
   * Download a skill version zip bundle.
   */
  retrieve(version, params, options) {
    const { skill_id } = params;
    return this._client.get(path`/skills/${skill_id}/versions/${version}/content`, {
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
};

// node_modules/openai/resources/skills/versions/versions.mjs
var Versions = class extends APIResource {
  constructor() {
    super(...arguments);
    this.content = new Content3(this._client);
  }
  /**
   * Create a new immutable skill version.
   */
  create(skillID, body = {}, options) {
    return this._client.post(path`/skills/${skillID}/versions`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Get a specific skill version.
   */
  retrieve(version, params, options) {
    const { skill_id } = params;
    return this._client.get(path`/skills/${skill_id}/versions/${version}`, options);
  }
  /**
   * List skill versions for a skill.
   */
  list(skillID, query = {}, options) {
    return this._client.getAPIList(path`/skills/${skillID}/versions`, CursorPage, {
      query,
      ...options
    });
  }
  /**
   * Delete a skill version.
   */
  delete(version, params, options) {
    const { skill_id } = params;
    return this._client.delete(path`/skills/${skill_id}/versions/${version}`, options);
  }
};
Versions.Content = Content3;

// node_modules/openai/resources/skills/skills.mjs
var Skills = class extends APIResource {
  constructor() {
    super(...arguments);
    this.content = new Content2(this._client);
    this.versions = new Versions(this._client);
  }
  /**
   * Create a new skill.
   */
  create(body = {}, options) {
    return this._client.post("/skills", maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Get a skill by its ID.
   */
  retrieve(skillID, options) {
    return this._client.get(path`/skills/${skillID}`, options);
  }
  /**
   * Update the default version pointer for a skill.
   */
  update(skillID, body, options) {
    return this._client.post(path`/skills/${skillID}`, { body, ...options });
  }
  /**
   * List all skills for the current project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/skills", CursorPage, { query, ...options });
  }
  /**
   * Delete a skill by its ID.
   */
  delete(skillID, options) {
    return this._client.delete(path`/skills/${skillID}`, options);
  }
};
Skills.Content = Content2;
Skills.Versions = Versions;

// node_modules/openai/resources/uploads/parts.mjs
var Parts = class extends APIResource {
  /**
   * Adds a
   * [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
   * A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
   * maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended
   * order of the Parts when you
   * [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
   */
  create(uploadID, body, options) {
    return this._client.post(path`/uploads/${uploadID}/parts`, multipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/openai/resources/uploads/uploads.mjs
var Uploads = class extends APIResource {
  constructor() {
    super(...arguments);
    this.parts = new Parts(this._client);
  }
  /**
   * Creates an intermediate
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
   * that you can add
   * [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an hour
   * after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * contains all the parts you uploaded. This File is usable in the rest of our
   * platform as a regular File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified. Please
   * refer to documentation for the
   * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please follow
   * the documentation on
   * [creating a File](https://platform.openai.com/docs/api-reference/files/create).
   *
   * Returns the Upload object with status `pending`.
   */
  create(body, options) {
    return this._client.post("/uploads", { body, ...options });
  }
  /**
   * Cancels the Upload. No Parts may be added after an Upload is cancelled.
   *
   * Returns the Upload object with status `cancelled`.
   */
  cancel(uploadID, options) {
    return this._client.post(path`/uploads/${uploadID}/cancel`, options);
  }
  /**
   * Completes the
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * is ready to use in the rest of the platform.
   *
   * You can specify the order of the Parts by passing in an ordered list of the Part
   * IDs.
   *
   * The number of bytes uploaded upon completion must match the number of bytes
   * initially specified when creating the Upload object. No Parts may be added after
   * an Upload is completed. Returns the Upload object with status `completed`,
   * including an additional `file` property containing the created usable File
   * object.
   */
  complete(uploadID, body, options) {
    return this._client.post(path`/uploads/${uploadID}/complete`, { body, ...options });
  }
};
Uploads.Parts = Parts;

// node_modules/openai/lib/Util.mjs
var allSettledWithThrow = async (promises) => {
  const results = await Promise.allSettled(promises);
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length) {
    for (const result of rejected) {
      console.error(result.reason);
    }
    throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
  }
  const values = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    }
  }
  return values;
};

// node_modules/openai/resources/vector-stores/file-batches.mjs
var FileBatches = class extends APIResource {
  /**
   * Create a vector store file batch.
   */
  create(vectorStoreID, body, options) {
    return this._client.post(path`/vector_stores/${vectorStoreID}/file_batches`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store file batch.
   */
  retrieve(batchID, params, options) {
    const { vector_store_id } = params;
    return this._client.get(path`/vector_stores/${vector_store_id}/file_batches/${batchID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Cancel a vector store file batch. This attempts to cancel the processing of
   * files in this batch as soon as possible.
   */
  cancel(batchID, params, options) {
    const { vector_store_id } = params;
    return this._client.post(path`/vector_stores/${vector_store_id}/file_batches/${batchID}/cancel`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Create a vector store batch and poll until all files have been processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const batch = await this.create(vectorStoreId, body);
    return await this.poll(vectorStoreId, batch.id, options);
  }
  /**
   * Returns a list of vector store files in a batch.
   */
  listFiles(batchID, params, options) {
    const { vector_store_id, ...query } = params;
    return this._client.getAPIList(path`/vector_stores/${vector_store_id}/file_batches/${batchID}/files`, CursorPage, { query, ...options, headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]) });
  }
  /**
   * Wait for the given file batch to be processed.
   *
   * Note: this will return even if one of the files failed to process, you need to
   * check batch.file_counts.failed_count to handle this case.
   */
  async poll(vectorStoreID, batchID, options) {
    const headers = buildHeaders([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const { data: batch, response } = await this.retrieve(batchID, { vector_store_id: vectorStoreID }, {
        ...options,
        headers
      }).withResponse();
      switch (batch.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "failed":
        case "cancelled":
        case "completed":
          return batch;
      }
    }
  }
  /**
   * Uploads the given files concurrently and then creates a vector store file batch.
   *
   * The concurrency limit is configurable using the `maxConcurrency` parameter.
   */
  async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
    if (files == null || files.length == 0) {
      throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
    }
    const configuredConcurrency = options?.maxConcurrency ?? 5;
    const concurrencyLimit = Math.min(configuredConcurrency, files.length);
    const client = this._client;
    const fileIterator = files.values();
    const allFileIds = [...fileIds];
    async function processFiles(iterator) {
      for (let item of iterator) {
        const fileObj = await client.files.create({ file: item, purpose: "assistants" }, options);
        allFileIds.push(fileObj.id);
      }
    }
    const workers = Array(concurrencyLimit).fill(fileIterator).map(processFiles);
    await allSettledWithThrow(workers);
    return await this.createAndPoll(vectorStoreId, {
      file_ids: allFileIds
    });
  }
};

// node_modules/openai/resources/vector-stores/files.mjs
var Files3 = class extends APIResource {
  /**
   * Create a vector store file by attaching a
   * [File](https://platform.openai.com/docs/api-reference/files) to a
   * [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
   */
  create(vectorStoreID, body, options) {
    return this._client.post(path`/vector_stores/${vectorStoreID}/files`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store file.
   */
  retrieve(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.get(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Update attributes on a vector store file.
   */
  update(fileID, params, options) {
    const { vector_store_id, ...body } = params;
    return this._client.post(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of vector store files.
   */
  list(vectorStoreID, query = {}, options) {
    return this._client.getAPIList(path`/vector_stores/${vectorStoreID}/files`, CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a vector store file. This will remove the file from the vector store but
   * the file itself will not be deleted. To delete the file, use the
   * [delete file](https://platform.openai.com/docs/api-reference/files/delete)
   * endpoint.
   */
  delete(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.delete(path`/vector_stores/${vector_store_id}/files/${fileID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Attach a file to the given vector store and wait for it to be processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const file = await this.create(vectorStoreId, body, options);
    return await this.poll(vectorStoreId, file.id, options);
  }
  /**
   * Wait for the vector store file to finish processing.
   *
   * Note: this will return even if the file failed to process, you need to check
   * file.last_error and file.status to handle these cases
   */
  async poll(vectorStoreID, fileID, options) {
    const headers = buildHeaders([
      options?.headers,
      {
        "X-Stainless-Poll-Helper": "true",
        "X-Stainless-Custom-Poll-Interval": options?.pollIntervalMs?.toString() ?? void 0
      }
    ]);
    while (true) {
      const fileResponse = await this.retrieve(fileID, {
        vector_store_id: vectorStoreID
      }, { ...options, headers }).withResponse();
      const file = fileResponse.data;
      switch (file.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options?.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = fileResponse.response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "failed":
        case "completed":
          return file;
      }
    }
  }
  /**
   * Upload a file to the `files` API and then attach it to the given vector store.
   *
   * Note the file will be asynchronously processed (you can use the alternative
   * polling helper method to wait for processing to complete).
   */
  async upload(vectorStoreId, file, options) {
    const fileInfo = await this._client.files.create({ file, purpose: "assistants" }, options);
    return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
  }
  /**
   * Add a file to a vector store and poll until processing is complete.
   */
  async uploadAndPoll(vectorStoreId, file, options) {
    const fileInfo = await this.upload(vectorStoreId, file, options);
    return await this.poll(vectorStoreId, fileInfo.id, options);
  }
  /**
   * Retrieve the parsed contents of a vector store file.
   */
  content(fileID, params, options) {
    const { vector_store_id } = params;
    return this._client.getAPIList(path`/vector_stores/${vector_store_id}/files/${fileID}/content`, Page, { ...options, headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers]) });
  }
};

// node_modules/openai/resources/vector-stores/vector-stores.mjs
var VectorStores = class extends APIResource {
  constructor() {
    super(...arguments);
    this.files = new Files3(this._client);
    this.fileBatches = new FileBatches(this._client);
  }
  /**
   * Create a vector store.
   */
  create(body, options) {
    return this._client.post("/vector_stores", {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Retrieves a vector store.
   */
  retrieve(vectorStoreID, options) {
    return this._client.get(path`/vector_stores/${vectorStoreID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Modifies a vector store.
   */
  update(vectorStoreID, body, options) {
    return this._client.post(path`/vector_stores/${vectorStoreID}`, {
      body,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Returns a list of vector stores.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/vector_stores", CursorPage, {
      query,
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Delete a vector store.
   */
  delete(vectorStoreID, options) {
    return this._client.delete(path`/vector_stores/${vectorStoreID}`, {
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
  /**
   * Search a vector store for relevant chunks based on a query and file attributes
   * filter.
   */
  search(vectorStoreID, body, options) {
    return this._client.getAPIList(path`/vector_stores/${vectorStoreID}/search`, Page, {
      body,
      method: "post",
      ...options,
      headers: buildHeaders([{ "OpenAI-Beta": "assistants=v2" }, options?.headers])
    });
  }
};
VectorStores.Files = Files3;
VectorStores.FileBatches = FileBatches;

// node_modules/openai/resources/videos.mjs
var Videos = class extends APIResource {
  /**
   * Create a new video generation job from a prompt and optional reference assets.
   */
  create(body, options) {
    return this._client.post("/videos", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Fetch the latest metadata for a generated video.
   */
  retrieve(videoID, options) {
    return this._client.get(path`/videos/${videoID}`, options);
  }
  /**
   * List recently generated videos for the current project.
   */
  list(query = {}, options) {
    return this._client.getAPIList("/videos", ConversationCursorPage, { query, ...options });
  }
  /**
   * Permanently delete a completed or failed video and its stored assets.
   */
  delete(videoID, options) {
    return this._client.delete(path`/videos/${videoID}`, options);
  }
  /**
   * Create a character from an uploaded video.
   */
  createCharacter(body, options) {
    return this._client.post("/videos/characters", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Download the generated video bytes or a derived preview asset.
   *
   * Streams the rendered video content for the specified video job.
   */
  downloadContent(videoID, query = {}, options) {
    return this._client.get(path`/videos/${videoID}/content`, {
      query,
      ...options,
      headers: buildHeaders([{ Accept: "application/binary" }, options?.headers]),
      __binaryResponse: true
    });
  }
  /**
   * Create a new video generation job by editing a source video or existing
   * generated video.
   */
  edit(body, options) {
    return this._client.post("/videos/edits", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Create an extension of a completed video.
   */
  extend(body, options) {
    return this._client.post("/videos/extensions", multipartFormRequestOptions({ body, ...options }, this._client));
  }
  /**
   * Fetch a character.
   */
  getCharacter(characterID, options) {
    return this._client.get(path`/videos/characters/${characterID}`, options);
  }
  /**
   * Create a remix of a completed video using a refreshed prompt.
   */
  remix(videoID, body, options) {
    return this._client.post(path`/videos/${videoID}/remix`, maybeMultipartFormRequestOptions({ body, ...options }, this._client));
  }
};

// node_modules/openai/resources/webhooks/webhooks.mjs
var _Webhooks_instances;
var _Webhooks_validateSecret;
var _Webhooks_getRequiredHeader;
var Webhooks = class extends APIResource {
  constructor() {
    super(...arguments);
    _Webhooks_instances.add(this);
  }
  /**
   * Validates that the given payload was sent by OpenAI and parses the payload.
   */
  async unwrap(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
    await this.verifySignature(payload, headers, secret, tolerance);
    return JSON.parse(payload);
  }
  /**
   * Validates whether or not the webhook payload was sent by OpenAI.
   *
   * An error will be raised if the webhook payload was not sent by OpenAI.
   *
   * @param payload - The webhook payload
   * @param headers - The webhook headers
   * @param secret - The webhook secret (optional, will use client secret if not provided)
   * @param tolerance - Maximum age of the webhook in seconds (default: 300 = 5 minutes)
   */
  async verifySignature(payload, headers, secret = this._client.webhookSecret, tolerance = 300) {
    if (typeof crypto === "undefined" || typeof crypto.subtle.importKey !== "function" || typeof crypto.subtle.verify !== "function") {
      throw new Error("Webhook signature verification is only supported when the `crypto` global is defined");
    }
    __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_validateSecret).call(this, secret);
    const headersObj = buildHeaders([headers]).values;
    const signatureHeader = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-signature");
    const timestamp = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-timestamp");
    const webhookId = __classPrivateFieldGet(this, _Webhooks_instances, "m", _Webhooks_getRequiredHeader).call(this, headersObj, "webhook-id");
    const timestampSeconds = parseInt(timestamp, 10);
    if (isNaN(timestampSeconds)) {
      throw new InvalidWebhookSignatureError("Invalid webhook timestamp format");
    }
    const nowSeconds = Math.floor(Date.now() / 1e3);
    if (nowSeconds - timestampSeconds > tolerance) {
      throw new InvalidWebhookSignatureError("Webhook timestamp is too old");
    }
    if (timestampSeconds > nowSeconds + tolerance) {
      throw new InvalidWebhookSignatureError("Webhook timestamp is too new");
    }
    const signatures = signatureHeader.split(" ").map((part) => part.startsWith("v1,") ? part.substring(3) : part);
    const decodedSecret = secret.startsWith("whsec_") ? Buffer.from(secret.replace("whsec_", ""), "base64") : Buffer.from(secret, "utf-8");
    const signedPayload = webhookId ? `${webhookId}.${timestamp}.${payload}` : `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey("raw", decodedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    for (const signature of signatures) {
      try {
        const signatureBytes = Buffer.from(signature, "base64");
        const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(signedPayload));
        if (isValid) {
          return;
        }
      } catch {
        continue;
      }
    }
    throw new InvalidWebhookSignatureError("The given webhook signature does not match the expected signature");
  }
};
_Webhooks_instances = /* @__PURE__ */ new WeakSet(), _Webhooks_validateSecret = function _Webhooks_validateSecret2(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error(`The webhook secret must either be set using the env var, OPENAI_WEBHOOK_SECRET, on the client class, OpenAI({ webhookSecret: '123' }), or passed to this function`);
  }
}, _Webhooks_getRequiredHeader = function _Webhooks_getRequiredHeader2(headers, name) {
  if (!headers) {
    throw new Error(`Headers are required`);
  }
  const value = headers.get(name);
  if (value === null || value === void 0) {
    throw new Error(`Missing required header: ${name}`);
  }
  return value;
};

// node_modules/openai/client.mjs
var _OpenAI_instances;
var _a2;
var _OpenAI_encoder;
var _OpenAI_baseURLOverridden;
var WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER = "workload-identity-auth";
var OpenAI = class {
  /**
   * API Client for interfacing with the OpenAI API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
   * @param {string | null | undefined} [opts.webhookSecret=process.env['OPENAI_WEBHOOK_SECRET'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("OPENAI_API_KEY"), organization = readEnv("OPENAI_ORG_ID") ?? null, project = readEnv("OPENAI_PROJECT_ID") ?? null, webhookSecret = readEnv("OPENAI_WEBHOOK_SECRET") ?? null, workloadIdentity, ...opts } = {}) {
    _OpenAI_instances.add(this);
    _OpenAI_encoder.set(this, void 0);
    this.completions = new Completions2(this);
    this.chat = new Chat(this);
    this.embeddings = new Embeddings(this);
    this.files = new Files2(this);
    this.images = new Images(this);
    this.audio = new Audio(this);
    this.moderations = new Moderations(this);
    this.models = new Models(this);
    this.fineTuning = new FineTuning(this);
    this.graders = new Graders2(this);
    this.vectorStores = new VectorStores(this);
    this.webhooks = new Webhooks(this);
    this.beta = new Beta(this);
    this.batches = new Batches(this);
    this.uploads = new Uploads(this);
    this.responses = new Responses(this);
    this.realtime = new Realtime2(this);
    this.conversations = new Conversations(this);
    this.evals = new Evals(this);
    this.containers = new Containers(this);
    this.skills = new Skills(this);
    this.videos = new Videos(this);
    if (workloadIdentity) {
      if (apiKey && apiKey !== WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER) {
        throw new OpenAIError("The `apiKey` and `workloadIdentity` arguments are mutually exclusive; only one can be passed at a time.");
      }
      apiKey = WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER;
    } else if (apiKey === void 0) {
      throw new OpenAIError("Missing credentials. Please pass an `apiKey`, `workloadIdentity`, or set the `OPENAI_API_KEY` environment variable.");
    }
    const options = {
      apiKey,
      organization,
      project,
      webhookSecret,
      workloadIdentity,
      ...opts,
      baseURL: baseURL || `https://api.openai.com/v1`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
    }
    this.baseURL = options.baseURL;
    this.timeout = options.timeout ?? _a2.DEFAULT_TIMEOUT;
    this.logger = options.logger ?? console;
    const defaultLogLevel = "warn";
    this.logLevel = defaultLogLevel;
    this.logLevel = parseLogLevel(options.logLevel, "ClientOptions.logLevel", this) ?? parseLogLevel(readEnv("OPENAI_LOG"), "process.env['OPENAI_LOG']", this) ?? defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? getDefaultFetch();
    __classPrivateFieldSet(this, _OpenAI_encoder, FallbackEncoder, "f");
    this._options = options;
    if (workloadIdentity) {
      this._workloadIdentityAuth = new WorkloadIdentityAuth(workloadIdentity, this.fetch);
    }
    this.apiKey = typeof apiKey === "string" ? apiKey : "Missing Key";
    this.organization = organization;
    this.project = project;
    this.webhookSecret = webhookSecret;
  }
  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options) {
    const client = new this.constructor({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      workloadIdentity: this._options.workloadIdentity,
      organization: this.organization,
      project: this.project,
      webhookSecret: this.webhookSecret,
      ...options
    });
    return client;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  validateHeaders({ values, nulls }) {
    return;
  }
  async authHeaders(opts) {
    return buildHeaders([{ Authorization: `Bearer ${this.apiKey}` }]);
  }
  stringifyQuery(query) {
    return stringifyQuery(query);
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  async _callApiKey() {
    const apiKey = this._options.apiKey;
    if (typeof apiKey !== "function")
      return false;
    let token;
    try {
      token = await apiKey();
    } catch (err) {
      if (err instanceof OpenAIError)
        throw err;
      throw new OpenAIError(
        `Failed to get token from 'apiKey' function: ${err.message}`,
        // @ts-ignore
        { cause: err }
      );
    }
    if (typeof token !== "string" || !token) {
      throw new OpenAIError(`Expected 'apiKey' function argument to return a string but it returned ${token}`);
    }
    this.apiKey = token;
    return true;
  }
  buildURL(path2, query, defaultBaseURL) {
    const baseURL = !__classPrivateFieldGet(this, _OpenAI_instances, "m", _OpenAI_baseURLOverridden).call(this) && defaultBaseURL || this.baseURL;
    const url = isAbsoluteURL(path2) ? new URL(path2) : new URL(baseURL + (baseURL.endsWith("/") && path2.startsWith("/") ? path2.slice(1) : path2));
    const defaultQuery = this.defaultQuery();
    const pathQuery = Object.fromEntries(url.searchParams);
    if (!isEmptyObj(defaultQuery) || !isEmptyObj(pathQuery)) {
      query = { ...pathQuery, ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
    await this._callApiKey();
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  get(path2, opts) {
    return this.methodRequest("get", path2, opts);
  }
  post(path2, opts) {
    return this.methodRequest("post", path2, opts);
  }
  patch(path2, opts) {
    return this.methodRequest("patch", path2, opts);
  }
  put(path2, opts) {
    return this.methodRequest("put", path2, opts);
  }
  delete(path2, opts) {
    return this.methodRequest("delete", path2, opts);
  }
  methodRequest(method, path2, opts) {
    return this.request(Promise.resolve(opts).then((opts2) => {
      return { method, path: path2, ...opts2 };
    }));
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, void 0));
  }
  async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining
    });
    await this.prepareRequest(req, { url, options });
    const requestLogID = "log_" + (Math.random() * (1 << 24) | 0).toString(16).padStart(6, "0");
    const retryLogStr = retryOfRequestLogID === void 0 ? "" : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();
    loggerFor(this).debug(`[${requestLogID}] sending request`, formatRequestDetails({
      retryOfRequestLogID,
      method: options.method,
      url,
      options,
      headers: req.headers
    }));
    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithAuth(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();
    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      const isTimeout = isAbortError(response) || /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
      if (retriesRemaining) {
        loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`);
        loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`, formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`);
      loggerFor(this).debug(`[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`, formatRequestDetails({
        retryOfRequestLogID,
        url,
        durationMs: headersTime - startTime,
        message: response.message
      }));
      if (response instanceof OAuthError || response instanceof SubjectTokenProviderError) {
        throw response;
      }
      if (isTimeout) {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const specialHeaders = [...response.headers.entries()].filter(([name]) => name === "x-request-id").map(([name, value]) => ", " + name + ": " + JSON.stringify(value)).join("");
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
    if (!response.ok) {
      if (response.status === 401 && this._workloadIdentityAuth && !options.__metadata?.["hasStreamingBody"] && !options.__metadata?.["workloadIdentityTokenRefreshed"]) {
        await CancelReadableStream(response.body);
        this._workloadIdentityAuth.invalidateToken();
        return this.makeRequest({
          ...options,
          __metadata: {
            ...options.__metadata,
            workloadIdentityTokenRefreshed: true
          }
        }, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        await CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage2}`);
        loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage2})`, formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          durationMs: headersTime - startTime
        }));
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID, response.headers);
      }
      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;
      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
      const errText = await response.text().catch((err2) => castToError(err2).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      loggerFor(this).debug(`[${requestLogID}] response error (${retryMessage})`, formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        message: errMessage,
        durationMs: Date.now() - startTime
      }));
      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }
    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(`[${requestLogID}] response start`, formatRequestDetails({
      retryOfRequestLogID,
      url: response.url,
      status: response.status,
      headers: response.headers,
      durationMs: headersTime - startTime
    }));
    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }
  getAPIList(path2, Page2, opts) {
    return this.requestAPIList(Page2, opts && "then" in opts ? opts.then((opts2) => ({ method: "get", path: path2, ...opts2 })) : { method: "get", path: path2, ...opts });
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null, void 0);
    return new PagePromise(this, request, Page2);
  }
  async fetchWithAuth(url, init, timeout, controller) {
    if (this._workloadIdentityAuth) {
      const headers = init.headers;
      const authHeader = headers.get("Authorization");
      if (!authHeader || authHeader === `Bearer ${WORKLOAD_IDENTITY_API_KEY_PLACEHOLDER}`) {
        const token = await this._workloadIdentityAuth.getToken();
        headers.set("Authorization", `Bearer ${token}`);
      }
    }
    const response = await this.fetchWithTimeout(url, init, timeout, controller);
    return response;
  }
  async fetchWithTimeout(url, init, ms, controller) {
    const { signal, method, ...options } = init || {};
    const abort = this._makeAbort(controller);
    if (signal)
      signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, ms);
    const isReadableBody = globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream || typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body;
    const fetchOptions = {
      signal: controller.signal,
      ...isReadableBody ? { duplex: "half" } : {},
      method: "GET",
      ...options
    };
    if (method) {
      fetchOptions.method = method.toUpperCase();
    }
    try {
      return await this.fetch.call(void 0, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }
  async shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders?.get("retry-after");
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (timeoutMillis === void 0) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  async buildRequest(inputOptions, { retryCount = 0 } = {}) {
    const options = { ...inputOptions };
    const { method, path: path2, query, defaultBaseURL } = options;
    const url = this.buildURL(path2, query, defaultBaseURL);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body, isStreamingBody } = this.buildBody({ options });
    if (isStreamingBody) {
      inputOptions.__metadata = {
        ...inputOptions.__metadata,
        hasStreamingBody: true
      };
    }
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });
    const req = {
      method,
      headers: reqHeaders,
      ...options.signal && { signal: options.signal },
      ...globalThis.ReadableStream && body instanceof globalThis.ReadableStream && { duplex: "half" },
      ...body && { body },
      ...this.fetchOptions ?? {},
      ...options.fetchOptions ?? {}
    };
    return { req, url, timeout: options.timeout };
  }
  async buildHeaders({ options, method, bodyHeaders, retryCount }) {
    let idempotencyHeaders = {};
    if (this.idempotencyHeader && method !== "get") {
      if (!options.idempotencyKey)
        options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }
    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: "application/json",
        "User-Agent": this.getUserAgent(),
        "X-Stainless-Retry-Count": String(retryCount),
        ...options.timeout ? { "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1e3)) } : {},
        ...getPlatformHeaders(),
        "OpenAI-Organization": this.organization,
        "OpenAI-Project": this.project
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers
    ]);
    this.validateHeaders(headers);
    return headers.values;
  }
  _makeAbort(controller) {
    return () => controller.abort();
  }
  buildBody({ options: { body, headers: rawHeaders } }) {
    if (!body) {
      return { bodyHeaders: void 0, body: void 0, isStreamingBody: false };
    }
    const headers = buildHeaders([rawHeaders]);
    const isReadableStream = typeof globalThis.ReadableStream !== "undefined" && body instanceof globalThis.ReadableStream;
    const isRetryableBody = !isReadableStream && (typeof body === "string" || body instanceof ArrayBuffer || ArrayBuffer.isView(body) || typeof globalThis.Blob !== "undefined" && body instanceof globalThis.Blob || body instanceof URLSearchParams || body instanceof FormData);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) || body instanceof ArrayBuffer || body instanceof DataView || typeof body === "string" && // Preserve legacy string encoding behavior for now
      headers.values.has("content-type") || // `Blob` is superset of `File`
      globalThis.Blob && body instanceof globalThis.Blob || // `FormData` -> `multipart/form-data`
      body instanceof FormData || // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams || // Send chunked stream (each chunk has own `length`)
      isReadableStream
    ) {
      return { bodyHeaders: void 0, body, isStreamingBody: !isRetryableBody };
    } else if (typeof body === "object" && (Symbol.asyncIterator in body || Symbol.iterator in body && "next" in body && typeof body.next === "function")) {
      return {
        bodyHeaders: void 0,
        body: ReadableStreamFrom(body),
        isStreamingBody: true
      };
    } else if (typeof body === "object" && headers.values.get("content-type") === "application/x-www-form-urlencoded") {
      return {
        bodyHeaders: { "content-type": "application/x-www-form-urlencoded" },
        body: this.stringifyQuery(body),
        isStreamingBody: false
      };
    } else {
      return { ...__classPrivateFieldGet(this, _OpenAI_encoder, "f").call(this, { body, headers }), isStreamingBody: false };
    }
  }
};
_a2 = OpenAI, _OpenAI_encoder = /* @__PURE__ */ new WeakMap(), _OpenAI_instances = /* @__PURE__ */ new WeakSet(), _OpenAI_baseURLOverridden = function _OpenAI_baseURLOverridden2() {
  return this.baseURL !== "https://api.openai.com/v1";
};
OpenAI.OpenAI = _a2;
OpenAI.DEFAULT_TIMEOUT = 6e5;
OpenAI.OpenAIError = OpenAIError;
OpenAI.APIError = APIError;
OpenAI.APIConnectionError = APIConnectionError;
OpenAI.APIConnectionTimeoutError = APIConnectionTimeoutError;
OpenAI.APIUserAbortError = APIUserAbortError;
OpenAI.NotFoundError = NotFoundError;
OpenAI.ConflictError = ConflictError;
OpenAI.RateLimitError = RateLimitError;
OpenAI.BadRequestError = BadRequestError;
OpenAI.AuthenticationError = AuthenticationError;
OpenAI.InternalServerError = InternalServerError;
OpenAI.PermissionDeniedError = PermissionDeniedError;
OpenAI.UnprocessableEntityError = UnprocessableEntityError;
OpenAI.InvalidWebhookSignatureError = InvalidWebhookSignatureError;
OpenAI.toFile = toFile;
OpenAI.Completions = Completions2;
OpenAI.Chat = Chat;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files2;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.FineTuning = FineTuning;
OpenAI.Graders = Graders2;
OpenAI.VectorStores = VectorStores;
OpenAI.Webhooks = Webhooks;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.Uploads = Uploads;
OpenAI.Responses = Responses;
OpenAI.Realtime = Realtime2;
OpenAI.Conversations = Conversations;
OpenAI.Evals = Evals;
OpenAI.Containers = Containers;
OpenAI.Skills = Skills;
OpenAI.Videos = Videos;

// src/types/scanResultV2.ts
var ZONE_IDS = [
  "forehead",
  "glabella",
  "left_temple",
  "right_temple",
  "left_undereye",
  "right_undereye",
  "left_crowsfeet",
  "right_crowsfeet",
  "nose_bridge",
  "nose_tip",
  "left_nasolabial",
  "right_nasolabial",
  "left_cheek",
  "right_cheek",
  "upper_lip",
  "lower_lip",
  "chin",
  "jawline_left",
  "jawline_right",
  "neck"
];
var CONCERN_IDS = [
  "fine_lines",
  "wrinkles",
  "dark_circles",
  "puffiness",
  "hyperpigmentation",
  "redness",
  "dryness",
  "oiliness",
  "texture",
  "enlarged_pores",
  "dullness",
  "uneven_tone",
  "blemishes",
  "sun_damage",
  "elasticity"
];
var MIN_FINDINGS = 3;
var MAX_FINDINGS = 6;

// src/ai/ai-contracts.ts
var AI_MODELS = {
  extraction: "gpt-5-mini",
  assistant: "gpt-5"
};
var AI_DEFAULTS = {
  extraction: {
    temperature: 0,
    max_tokens: 4096,
    /**
     * Carried over for parity with the legacy interface. Not used by
     * the OpenAI client — strict json_schema response_format implies
     * single-call structured output. Kept on the type so existing
     * server-side handlers that read it still compile.
     */
    disable_parallel_tool_use: true
  },
  assistant: {
    temperature: 0.2,
    // v19.5 — bumped 1500 → 4096. GPT-5's reasoning tokens count
    // against the same budget as output content. The 1500 cap was
    // regularly producing finish_reason="length" + empty content,
    // which then failed validateAssistantAnswer and surfaced as
    // "answerAssistant returned a payload that failed structural
    // validation". 4096 leaves enough head-room for reasoning +
    // a real assistant reply.
    max_tokens: 4096
  }
};
var CONCERN_TYPE_ENUM = [
  "breakouts",
  "hydration",
  "texture",
  "dark_marks",
  "redness",
  "oiliness",
  "sensitivity",
  "pores"
];
var SEVERITY_ENUM = [
  "none",
  "low",
  "mild",
  "moderate",
  "high"
];
var DIRECTION_ENUM = [
  "better",
  "same",
  "worse",
  "new"
];
var FACE_REGION_ENUM = [
  "forehead",
  "t_zone",
  "left_cheek",
  "right_cheek",
  "nose",
  "chin",
  "jawline",
  "under_eyes",
  "across_face"
];
var PRODUCT_CATEGORY_ENUM = [
  "cleanser",
  "serum",
  "moisturizer",
  "spot_treatment",
  "toner",
  "spf",
  "mask",
  "unknown"
];
var PRODUCT_CATEGORY_NON_UNKNOWN_ENUM = [
  "cleanser",
  "serum",
  "moisturizer",
  "spot_treatment",
  "toner",
  "spf",
  "mask"
];
var ROUTINE_SLOT_ENUM = [
  "morning",
  "evening",
  "saved"
];
var SCORE_BAND_ENUM = ["poor", "fair", "good", "great"];
var MATCH_BAND_ENUM = ["weak", "fair", "strong", "excellent"];
var IMAGE_QUALITY_ISSUE_ENUM = [
  "blurry",
  "low_light",
  "angled",
  "partial_face",
  "occluded"
];
var DELTA_REFERENCE_ENUM = ["previous_scan", "baseline", "none"];
var FACE_SCAN_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "scan_id",
    "analyzed_at_iso",
    "image_quality",
    "skin_score",
    "primary_concern",
    "secondary_concerns",
    "findings",
    "score_factors",
    "next_focus",
    "plan_inputs",
    "face_overlay"
  ],
  properties: {
    scan_id: { type: "string" },
    analyzed_at_iso: {
      type: "string",
      description: "ISO 8601 timestamp the analysis was produced at."
    },
    image_quality: {
      type: "object",
      additionalProperties: false,
      required: ["usable", "issues", "confidence"],
      properties: {
        usable: { type: "boolean" },
        issues: {
          type: "array",
          items: { type: "string", enum: [...IMAGE_QUALITY_ISSUE_ENUM] }
        },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      }
    },
    skin_score: {
      type: "object",
      additionalProperties: false,
      required: [
        "value",
        "band",
        "delta_vs_previous",
        "delta_vs_baseline",
        "why_line",
        "explanation"
      ],
      properties: {
        value: { type: "integer", minimum: 0, maximum: 100 },
        band: { type: "string", enum: [...SCORE_BAND_ENUM] },
        delta_vs_previous: { type: ["integer", "null"] },
        delta_vs_baseline: { type: ["integer", "null"] },
        why_line: { type: "string" },
        explanation: { type: "string" }
      }
    },
    primary_concern: {
      oneOf: [
        { type: "string", enum: [...CONCERN_TYPE_ENUM] },
        { type: "null" }
      ]
    },
    secondary_concerns: {
      type: "array",
      items: { type: "string", enum: [...CONCERN_TYPE_ENUM] }
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "concern",
          "severity",
          "direction_vs_previous",
          "confidence",
          "regions",
          "user_summary",
          "clinician_style_summary",
          "marker_priority",
          "region_polygon"
        ],
        properties: {
          concern: { type: "string", enum: [...CONCERN_TYPE_ENUM] },
          severity: { type: "string", enum: [...SEVERITY_ENUM] },
          direction_vs_previous: {
            type: "string",
            enum: [...DIRECTION_ENUM]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          regions: {
            type: "array",
            items: { type: "string", enum: [...FACE_REGION_ENUM] }
          },
          user_summary: { type: "string" },
          clinician_style_summary: { type: "string" },
          marker_priority: { type: "integer", enum: [0, 1, 2, 3] },
          // v17.0 — image-anchored polygon outlining where the model
          // visually observes this concern. Coordinates normalized
          // 0..1 against the captured image dimensions.
          region_polygon: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["x", "y"],
              properties: {
                x: { type: "number", minimum: 0, maximum: 1 },
                y: { type: "number", minimum: 0, maximum: 1 }
              }
            }
          }
        }
      }
    },
    score_factors: {
      type: "object",
      additionalProperties: false,
      required: [
        "breakouts",
        "hydration",
        "texture",
        "dark_marks",
        "redness",
        "oiliness",
        "sensitivity",
        "pores"
      ],
      properties: {
        breakouts: { type: "integer", minimum: 0, maximum: 100 },
        hydration: { type: "integer", minimum: 0, maximum: 100 },
        texture: { type: "integer", minimum: 0, maximum: 100 },
        dark_marks: { type: "integer", minimum: 0, maximum: 100 },
        redness: { type: "integer", minimum: 0, maximum: 100 },
        oiliness: { type: "integer", minimum: 0, maximum: 100 },
        sensitivity: { type: "integer", minimum: 0, maximum: 100 },
        pores: { type: "integer", minimum: 0, maximum: 100 }
      }
    },
    next_focus: {
      type: "object",
      additionalProperties: false,
      required: ["tonight", "avoid"],
      properties: {
        tonight: {
          type: "array",
          items: { type: "string" }
        },
        avoid: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    plan_inputs: {
      type: "object",
      additionalProperties: false,
      required: [
        "target_concerns",
        "preferred_product_categories",
        "contraindication_tags"
      ],
      properties: {
        target_concerns: {
          type: "array",
          items: { type: "string", enum: [...CONCERN_TYPE_ENUM] }
        },
        preferred_product_categories: {
          type: "array",
          items: {
            type: "string",
            enum: [...PRODUCT_CATEGORY_NON_UNKNOWN_ENUM]
          }
        },
        contraindication_tags: {
          type: "array",
          items: { type: "string" }
        }
      }
    },
    // v17.0 — image-anchored face overlay (real face_box +
    // landmarks). All coordinates normalized 0..1 against the
    // captured image. Drives the FaceSkinMap component.
    face_overlay: {
      type: "object",
      additionalProperties: false,
      required: ["face_box", "landmarks"],
      properties: {
        face_box: {
          type: "object",
          additionalProperties: false,
          required: ["x", "y", "width", "height"],
          properties: {
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
            width: { type: "number", minimum: 0, maximum: 1 },
            height: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        landmarks: {
          type: "object",
          additionalProperties: false,
          required: [
            "left_eye",
            "right_eye",
            "nose_tip",
            "mouth_center",
            "chin",
            "forehead_center"
          ],
          properties: {
            left_eye: pointSchema(),
            right_eye: pointSchema(),
            nose_tip: pointSchema(),
            mouth_center: pointSchema(),
            chin: pointSchema(),
            forehead_center: pointSchema()
          }
        }
      }
    }
  }
};
function pointSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["x", "y"],
    properties: {
      x: { type: "number", minimum: 0, maximum: 1 },
      y: { type: "number", minimum: 0, maximum: 1 }
    }
  };
}
var PRODUCT_IDENTITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "source",
    "confidence",
    "resolved",
    "brand",
    "product_name",
    "canonical_title",
    "product_category",
    "likely_concerns_supported",
    "key_claims",
    "barcode_value",
    "catalog_lookup_key",
    "packaging_notes"
  ],
  properties: {
    source: { type: "string", enum: ["barcode", "image", "hybrid"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    resolved: { type: "boolean" },
    brand: { type: ["string", "null"] },
    product_name: { type: ["string", "null"] },
    canonical_title: { type: ["string", "null"] },
    product_category: { type: "string", enum: [...PRODUCT_CATEGORY_ENUM] },
    likely_concerns_supported: {
      type: "array",
      items: { type: "string", enum: [...CONCERN_TYPE_ENUM] }
    },
    key_claims: {
      type: "array",
      items: { type: "string" }
    },
    barcode_value: { type: ["string", "null"] },
    catalog_lookup_key: { type: ["string", "null"] },
    packaging_notes: { type: "string" }
  }
};
var BARCODE_RESOLUTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "barcode_value",
    "found",
    "matched_catalog_product_id",
    "identity",
    "fallback_needed"
  ],
  properties: {
    barcode_value: { type: "string" },
    found: { type: "boolean" },
    matched_catalog_product_id: { type: ["string", "null"] },
    identity: {
      oneOf: [PRODUCT_IDENTITY_SCHEMA, { type: "null" }]
    },
    fallback_needed: { type: "boolean" }
  }
};
var PREFLIGHT_REASON_ENUM = [
  "ok",
  "no_face",
  "partial_face",
  "too_dark",
  "too_blurry",
  "not_centered",
  "unknown"
];
var SCAN_PREFLIGHT_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "face_present",
    "full_face_visible",
    "centered_enough",
    "lighting_ok",
    "blur_ok",
    "face_box",
    "reason",
    "retry_message"
  ],
  properties: {
    face_present: { type: "boolean" },
    full_face_visible: { type: "boolean" },
    centered_enough: { type: "boolean" },
    lighting_ok: { type: "boolean" },
    blur_ok: { type: "boolean" },
    face_box: {
      oneOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["x", "y", "width", "height"],
          properties: {
            x: { type: "number", minimum: 0, maximum: 1 },
            y: { type: "number", minimum: 0, maximum: 1 },
            width: { type: "number", minimum: 0, maximum: 1 },
            height: { type: "number", minimum: 0, maximum: 1 }
          }
        },
        { type: "null" }
      ]
    },
    reason: { type: "string", enum: [...PREFLIGHT_REASON_ENUM] },
    retry_message: { type: "string" }
  }
};
var PRODUCT_MATCH_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "product_id",
    "match_score",
    "match_band",
    "primary_reasons",
    "target_concerns",
    "recommended_slot",
    "natural_option",
    "avoid_if_tags"
  ],
  properties: {
    product_id: { type: "string" },
    match_score: { type: "integer", minimum: 0, maximum: 100 },
    match_band: { type: "string", enum: [...MATCH_BAND_ENUM] },
    primary_reasons: {
      type: "array",
      items: { type: "string" }
    },
    target_concerns: {
      type: "array",
      items: { type: "string", enum: [...CONCERN_TYPE_ENUM] }
    },
    recommended_slot: { type: "string", enum: [...ROUTINE_SLOT_ENUM] },
    natural_option: { type: "boolean" },
    avoid_if_tags: {
      type: "array",
      items: { type: "string" }
    }
  }
};
var PRODUCT_MATCH_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "for_user_id",
    "based_on_scan_id",
    "top_pick_product_id",
    "matches",
    "alternatives"
  ],
  properties: {
    for_user_id: { type: "string" },
    based_on_scan_id: { type: ["string", "null"] },
    top_pick_product_id: { type: ["string", "null"] },
    matches: {
      type: "array",
      items: PRODUCT_MATCH_ITEM_SCHEMA
    },
    alternatives: {
      type: "array",
      items: PRODUCT_MATCH_ITEM_SCHEMA
    }
  }
};
var ROUTINE_ACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "slot",
    "step_order",
    "title",
    "instruction",
    "linked_product_id",
    "reason"
  ],
  properties: {
    slot: { type: "string", enum: [...ROUTINE_SLOT_ENUM] },
    step_order: { type: "integer", minimum: 1 },
    title: { type: "string" },
    instruction: { type: "string" },
    linked_product_id: { type: ["string", "null"] },
    reason: { type: "string" }
  }
};
var ROUTINE_RECOMMENDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "based_on_scan_id",
    "headline",
    "tonight_focus",
    "morning",
    "evening",
    "saved_for_later",
    "reminder_recommended"
  ],
  properties: {
    based_on_scan_id: { type: ["string", "null"] },
    headline: { type: "string" },
    tonight_focus: { type: "string" },
    morning: { type: "array", items: ROUTINE_ACTION_SCHEMA },
    evening: { type: "array", items: ROUTINE_ACTION_SCHEMA },
    saved_for_later: { type: "array", items: ROUTINE_ACTION_SCHEMA },
    reminder_recommended: { type: "boolean" }
  }
};
var SKIN_SCORE_EXPLANATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "score",
    "band",
    "delta_reference",
    "delta_value",
    "short_status",
    "why_line",
    "coach_line"
  ],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    band: { type: "string", enum: [...SCORE_BAND_ENUM] },
    delta_reference: { type: "string", enum: [...DELTA_REFERENCE_ENUM] },
    delta_value: { type: ["integer", "null"] },
    short_status: { type: "string" },
    why_line: { type: "string" },
    coach_line: { type: "string" }
  }
};
var PROGRESS_EXPLANATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "strongest_improvement",
    "strongest_regression",
    "unchanged_summary",
    "short_narrative",
    "compare_caption"
  ],
  properties: {
    strongest_improvement: { type: "string" },
    strongest_regression: { type: ["string", "null"] },
    unchanged_summary: { type: "string" },
    short_narrative: { type: "string" },
    compare_caption: { type: "string" }
  }
};
var SEARCH_SUGGESTION_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["prefill_placeholder", "suggestion_chips", "refinement_chips"],
  properties: {
    prefill_placeholder: { type: "string" },
    suggestion_chips: {
      type: "array",
      items: { type: "string" }
    },
    refinement_chips: {
      type: "array",
      items: { type: "string" }
    }
  }
};
var LIVE_PRODUCT_CANDIDATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "brand",
    "name",
    "category",
    "concernTags",
    "skinTypeTags",
    "ingredientsHighlights",
    "price",
    "currency",
    "merchantName",
    "productUrl",
    "imageUrl",
    "imageSource",
    "shortDescription",
    "matchReason",
    "availability",
    "matchScore"
  ],
  properties: {
    id: { type: "string" },
    brand: { type: "string" },
    name: { type: "string" },
    category: { type: "string", enum: [...PRODUCT_CATEGORY_ENUM] },
    concernTags: {
      type: "array",
      items: { type: "string", enum: [...CONCERN_TYPE_ENUM] }
    },
    skinTypeTags: {
      type: "array",
      items: { type: "string" }
    },
    ingredientsHighlights: {
      type: "array",
      items: { type: "string" }
    },
    price: { type: ["number", "null"] },
    currency: { type: "string" },
    merchantName: { type: ["string", "null"] },
    productUrl: { type: ["string", "null"] },
    imageUrl: { type: ["string", "null"] },
    imageSource: {
      type: "string",
      enum: ["merchant", "brand", "obf", "none"]
    },
    shortDescription: { type: "string" },
    matchReason: { type: "string" },
    availability: { type: "string", enum: ["available", "unknown"] },
    matchScore: { type: "integer", minimum: 0, maximum: 100 }
  }
};
var LIVE_PRODUCT_CANDIDATE_LEAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "brand",
    "name",
    "category",
    "concernTags",
    "ingredientsHighlights",
    "price",
    "shortDescription",
    "matchReason",
    "matchScore"
  ],
  properties: {
    id: { type: "string" },
    brand: { type: "string" },
    name: { type: "string" },
    category: { type: "string", enum: [...PRODUCT_CATEGORY_ENUM] },
    concernTags: {
      type: "array",
      items: { type: "string", enum: [...CONCERN_TYPE_ENUM] }
    },
    ingredientsHighlights: {
      type: "array",
      items: { type: "string" }
    },
    price: { type: ["number", "null"] },
    shortDescription: { type: "string" },
    matchReason: { type: "string" },
    matchScore: { type: "integer", minimum: 0, maximum: 100 }
  }
};
var LIVE_PRODUCT_LOOKUP_LEAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["query", "candidates", "confidence"],
  properties: {
    query: { type: "string" },
    candidates: {
      type: "array",
      items: LIVE_PRODUCT_CANDIDATE_LEAN_SCHEMA
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] }
  }
};
var PRODUCT_RERANK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["heroId", "alternativeIds", "whyHeroFits", "whatToAvoid"],
  properties: {
    heroId: { type: ["string", "null"] },
    alternativeIds: {
      type: "array",
      items: { type: "string" }
    },
    whyHeroFits: { type: ["string", "null"] },
    whatToAvoid: {
      type: "array",
      items: { type: "string" }
    }
  }
};
var PRODUCT_RECOMMENDATION_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "recommendationMode",
    "userNeedSummary",
    "dominantConcern",
    "slots"
  ],
  properties: {
    recommendationMode: {
      type: "string",
      enum: ["best_for_you", "query_driven_search"]
    },
    userNeedSummary: { type: "string" },
    dominantConcern: { type: ["string", "null"] },
    slots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "slotKey",
          "slotLabel",
          "queryFamily",
          "targetNeed",
          "mustHaveSignals",
          "avoidSignals",
          "searchQueries",
          "whyThisSlotMatters"
        ],
        properties: {
          slotKey: { type: "string" },
          slotLabel: { type: "string" },
          queryFamily: {
            type: "string",
            enum: [
              "moisturizer",
              "serum_texture",
              "chemical_exfoliant",
              "blemish_support",
              "spf",
              "cleanser",
              "other"
            ]
          },
          targetNeed: { type: "string" },
          mustHaveSignals: { type: "array", items: { type: "string" } },
          avoidSignals: { type: "array", items: { type: "string" } },
          searchQueries: { type: "array", items: { type: "string" } },
          whyThisSlotMatters: { type: "string" }
        }
      }
    }
  }
};
var SLOT_SELECTION_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["selections", "listReason"],
  properties: {
    selections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slotKey", "selectedCandidateId", "whyPicked", "whyNotOthersShort"],
        properties: {
          slotKey: { type: "string" },
          selectedCandidateId: { type: ["string", "null"] },
          whyPicked: { type: "string" },
          whyNotOthersShort: { type: "string" }
        }
      }
    },
    listReason: { type: "string" }
  }
};
var SEARCH_INTENT_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "recommendationMode",
    "rawQuery",
    "normalizedQuery",
    "searchIntentLabel",
    "dominantProductFamily",
    "userNeedSummary",
    "mustHaveSignals",
    "avoidSignals",
    "preferredTextures",
    "searchQueries",
    "rankingPriorities"
  ],
  properties: {
    recommendationMode: { type: "string", enum: ["typed_search"] },
    rawQuery: { type: "string" },
    normalizedQuery: { type: "string" },
    searchIntentLabel: { type: "string" },
    dominantProductFamily: {
      type: "string",
      enum: [
        "moisturizer",
        "serum_texture",
        "chemical_exfoliant",
        "blemish_support",
        "spf",
        "cleanser",
        "other"
      ]
    },
    userNeedSummary: { type: "string" },
    mustHaveSignals: { type: "array", items: { type: "string" } },
    avoidSignals: { type: "array", items: { type: "string" } },
    preferredTextures: { type: "array", items: { type: "string" } },
    searchQueries: { type: "array", items: { type: "string" } },
    rankingPriorities: { type: "array", items: { type: "string" } }
  }
};
var SCAN_RESULT_V2_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "overall_score",
    "score_breakdown",
    "headline",
    "summary",
    "findings",
    // v34 — premium pipeline always returns these so the UI never has
    // to fabricate overlays / insights / routine seed in the client.
    "overlays",
    "top_focus_priority",
    "insights",
    "routine_seed",
    "quality"
  ],
  properties: {
    overall_score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Overall skin score 0-100. 70-90 is typical for healthy skin."
    },
    score_breakdown: {
      type: "object",
      additionalProperties: false,
      required: ["hydration", "texture", "tone", "clarity", "vitality"],
      properties: {
        hydration: { type: "integer", minimum: 0, maximum: 100 },
        texture: { type: "integer", minimum: 0, maximum: 100 },
        tone: { type: "integer", minimum: 0, maximum: 100 },
        clarity: { type: "integer", minimum: 0, maximum: 100 },
        vitality: { type: "integer", minimum: 0, maximum: 100 }
      }
    },
    headline: {
      type: "string",
      description: "One short editorial sentence, max 8 words.",
      minLength: 6,
      maxLength: 80
    },
    summary: {
      type: "string",
      description: "2-3 sentences, warm but specific, no fluff.",
      minLength: 30,
      maxLength: 360
    },
    findings: {
      type: "array",
      minItems: MIN_FINDINGS,
      maxItems: MAX_FINDINGS,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "zone",
          "concern",
          "severity",
          "title",
          "observation",
          "recommendation",
          "ingredient_hints",
          "confidence"
        ],
        properties: {
          id: { type: "string", minLength: 4, maxLength: 64 },
          zone: { type: "string", enum: [...ZONE_IDS] },
          concern: { type: "string", enum: [...CONCERN_IDS] },
          severity: { type: "integer", minimum: 1, maximum: 5 },
          title: { type: "string", minLength: 4, maxLength: 60 },
          observation: { type: "string", minLength: 10, maxLength: 220 },
          recommendation: { type: "string", minLength: 8, maxLength: 220 },
          ingredient_hints: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string", minLength: 2, maxLength: 40 }
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Visual-evidence confidence (0..1) that this finding is actually visible. Mild but visible = 0.55-0.7; clear = 0.75+."
          }
        }
      }
    },
    // v34 — Overlays drawn on the user's real photograph.
    overlays: {
      type: "array",
      minItems: 0,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["zone", "concern", "style", "opacity", "finding_id"],
        properties: {
          zone: { type: "string", enum: [...ZONE_IDS] },
          concern: { type: "string", enum: [...CONCERN_IDS] },
          style: {
            type: "string",
            enum: ["soft_mask", "heatmap", "outline", "pin"]
          },
          opacity: { type: "number", minimum: 0.1, maximum: 0.55 },
          finding_id: { type: "string", minLength: 1, maxLength: 64 }
        }
      }
    },
    // v34 — Top-priority focus areas: ordered list of finding ids,
    // first = primary focus. Max 4.
    top_focus_priority: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 64 }
    },
    // v34 — 2-4 personalized insights derived from the scan.
    insights: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "body", "icon", "related_finding_ids"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 48 },
          title: { type: "string", minLength: 4, maxLength: 32 },
          body: { type: "string", minLength: 12, maxLength: 200 },
          icon: {
            type: "string",
            enum: [
              "barrier",
              "hydration",
              "clarity",
              "tone",
              "consistency",
              "protection",
              "gentle"
            ]
          },
          related_finding_ids: {
            type: "array",
            minItems: 0,
            maxItems: 4,
            items: { type: "string", minLength: 1, maxLength: 64 }
          }
        }
      }
    },
    // v34 — Seed the routine builder consumes deterministically.
    routine_seed: {
      type: "object",
      additionalProperties: false,
      required: [
        "skin_needs",
        "avoid_tonight",
        "recommended_step_types",
        "intensity",
        "step_taglines"
      ],
      properties: {
        skin_needs: {
          type: "array",
          minItems: 1,
          maxItems: 5,
          items: { type: "string", minLength: 2, maxLength: 48 }
        },
        avoid_tonight: {
          type: "array",
          minItems: 0,
          maxItems: 5,
          items: { type: "string", minLength: 2, maxLength: 48 }
        },
        recommended_step_types: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: {
            type: "string",
            enum: ["cleanse", "treat", "moisturize", "protect"]
          }
        },
        intensity: {
          type: "string",
          enum: ["gentle", "moderate", "active"]
        },
        step_taglines: {
          type: "object",
          additionalProperties: false,
          required: ["cleanse", "treat", "moisturize", "protect"],
          properties: {
            cleanse: { type: "string", minLength: 4, maxLength: 80 },
            treat: { type: "string", minLength: 4, maxLength: 80 },
            moisturize: { type: "string", minLength: 4, maxLength: 80 },
            protect: { type: "string", minLength: 4, maxLength: 80 }
          }
        }
      }
    },
    // v34 — Quality classification (full vs. limited).
    quality: {
      type: "object",
      additionalProperties: false,
      required: ["usable", "mode", "score", "reasons"],
      properties: {
        usable: { type: "boolean" },
        mode: { type: "string", enum: ["full", "limited"] },
        score: { type: "number", minimum: 0, maximum: 1 },
        reasons: {
          type: "array",
          minItems: 0,
          maxItems: 5,
          items: { type: "string", minLength: 1, maxLength: 120 }
        }
      }
    }
  }
};

// server/openai/openai-client.ts
var AIError = class extends Error {
  constructor(reason, schemaName, finishReason = null) {
    super(
      `OpenAIClient: ${reason} for ${schemaName}` + (finishReason ? ` (finish_reason=${finishReason})` : "")
    );
    this.reason = reason;
    this.schemaName = schemaName;
    this.finishReason = finishReason;
    this.name = "AIError";
  }
  reason;
  schemaName;
  finishReason;
};
function toStrictSchema(input) {
  if (Array.isArray(input)) {
    return input.map(
      (v) => typeof v === "object" && v !== null ? toStrictSchema(v) : v
    );
  }
  if (input === null || typeof input !== "object") return input;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    const key = k === "oneOf" ? "anyOf" : k;
    if (Array.isArray(v)) {
      out[key] = v.map(
        (item) => typeof item === "object" && item !== null ? toStrictSchema(item) : item
      );
    } else if (typeof v === "object" && v !== null) {
      out[key] = toStrictSchema(v);
    } else {
      out[key] = v;
    }
  }
  return out;
}
var PRODUCT_RERANK_SYSTEM_PROMPT = `
You are the final decision engine for skincare product selection.

Your job is NOT to find products.
Your job is NOT to behave like a generic shopping assistant.
Your job is NOT to choose broad acceptable category matches.

Your job is to choose the strongest possible products for ONE specific user from an already retrieved shortlist.

You will receive:
- the user's query
- the interpreted query family / intent if available
- the user's skin type
- the user's sensitivities
- the user's top concerns
- the user's goals
- the user's latest scan summary
- a shortlist of candidate products

You must act like an elite skincare product selector whose output will be judged publicly for trust and accuracy.

PRIMARY OBJECTIVE

Choose the best product for THIS specific user.
A product that merely matches the category is NOT enough.
A product that is broad, generic, acceptable, or filler is NOT enough.
The hero must feel clearly more correct for this user than the alternatives.

DECISION PROCESS

Apply this decision process strictly:

STEP 1 \u2014 HARD ELIMINATION
Silently eliminate any candidate that conflicts with the user's skin profile, sensitivities, or dominant concern.

Examples:
- oily / acne-prone user: eliminate heavy rich occlusive creams unless barrier repair clearly dominates
- dry / barrier-compromised user: eliminate ultra-light gel-only moisturizers if they are too weak for the need
- sensitive / redness-prone user: eliminate fragranced or harsh-active products when gentler options exist
- smoothing serum query: eliminate unrelated hydrating serums with no real texture/smoothing relevance
- chemical exfoliant query: eliminate unrelated non-exfoliant products
- breakout query: eliminate products likely to worsen clogging or conflict with breakout safety

If a candidate conflicts with the skin profile and stronger alternatives exist, it must not become hero.

STEP 2 \u2014 USER-FIT RANKING
Among the surviving candidates, rank them using this exact priority order:
1. fit to the user's actual skin type
2. fit to the user's sensitivities / redness / breakout risk / barrier state
3. fit to the user's top concerns and latest scan summary
4. fit to the actual query intent
5. formula / texture appropriateness
6. ingredient-family relevance when useful
7. only after all of the above, broad category relevance

This order is mandatory.
Do not let a broad category match outrank a stronger user-fit match.

STEP 3 \u2014 FILLER REJECTION
Reject filler.
A filler product is:
- a broad generic category match
- a product with weak evidence of actual user fit
- a product that is \u201Csafe enough\u201D but not clearly right
- a product that would look random to a user reading the result

If two products are both plausible, choose the one that is more specifically right for the user.
Do not reward genericity.

MOISTURIZER RULES

If the query is moisturizer-family (such as "moisturizer", "best moisturizer", "moisturizer for me", or moisturizer is the selected product class for a vague query):

For oily / acne-prone / breakout-prone users:
- strongly prefer lightweight hydration
- strongly prefer gel moisturizer, gel cream, oil-free moisturizer, non-comedogenic moisturizer
- avoid heavy rich creams, balms, ointments, or occlusive repair creams unless dryness/barrier repair is clearly dominant

For dry / dehydrated / barrier-compromised users:
- strongly prefer ceramide support, barrier repair, rich hydration, repairing cream, fragrance-free cream
- avoid ultra-light gel-only moisturizers if they are clearly too weak for the user's dryness/barrier need

For sensitive / redness-prone users:
- strongly prefer fragrance-free, calming, soothing, cica, centella, redness-safe moisturizers
- avoid fragranced moisturizers, harsh-active moisturizers, and anything likely to aggravate sensitivity/redness

For combination users:
- prefer balanced lightweight hydration
- prefer gel cream / daily lightweight moisturizer
- avoid very heavy occlusive creams unless dryness/barrier signals are also strong

Do not choose a random generic moisturizer if a clearly more skin-appropriate moisturizer exists.

SMOOTHING SERUM RULES

If the query is smoothing-serum-family:
- prioritize true texture smoothing / resurfacing / smoothing relevance
- prefer peptide, lactic, PHA, or gentle resurfacing logic when appropriate
- if the user is sensitive or redness-prone, prefer gentler texture-support options over harsher ones
- do not choose a random hydrating serum with no real smoothing relevance
- do not choose unrelated toner / cleanser / generic serum products just because they weakly match words

CHEMICAL EXFOLIANT RULES

If the query is chemical-exfoliant-family:
- prioritize true exfoliation relevance
- prefer salicylic, lactic, glycolic, or PHA options as appropriate
- if the user is sensitive/redness-prone or barrier-compromised, prefer gentler exfoliation logic over aggressive exfoliation
- do not choose non-exfoliant products that only weakly match the category
- do not choose harsh aggressive exfoliants for users whose profile suggests caution

"BEST FOR MY SKIN" RULE

If the query is vague, such as "best for my skin":
- infer the dominant need from skin type, sensitivities, goals, top concerns, and latest scan summary
- choose products that directly serve that dominant need
- do not stay generic
- do not behave like the user asked for a broad category recommendation
- the recommendation must feel specific to the user, not generic

"BEST FOR MY PIMPLE" RULE

If the query is breakout/pimple-focused:
- prioritize blemish-supportive, acne-safe, non-comedogenic, relevant treatment logic
- prefer products that fit the user's breakout profile without conflicting with sensitivity constraints
- do not choose heavy occlusive moisturizers for breakout-prone users unless there is an unusually strong reason
- do not choose random calming-only products unless sensitivity/redness clearly dominates the actual need

INTERNAL SELECTION CHECK

Before choosing the hero, silently test each top candidate against these questions:
- Why does this product fit this user specifically?
- Why is it better than the other shortlisted candidates?
- Does it fit the user's skin type?
- Does it respect the user's sensitivities?
- Does it align with the user's top concerns and latest scan?
- Is the texture/formula appropriate for the user?
- Is this a real fit, or just a generic category match?

Reject candidates that fail those questions.
Do not expose that hidden reasoning.
Use it to choose better.

OUTPUT QUALITY STANDARD

Act as if this app is launching publicly tomorrow and users will immediately judge whether the recommendations are intelligent or random.
The final picks must feel high-confidence, selective, and genuinely personalized.
Fewer strong picks are better than many mediocre picks.

WHY-HERO-FITS REQUIREMENT

The whyHeroFits text must be concise, specific, and user-aware.
It must reference the user's actual skin profile and query intent.
It should sound like an expert reason, not generic marketing copy.

Good examples:
- "Picked because your skin reads oily and breakout-prone, so this favors lightweight non-comedogenic hydration instead of a heavier cream."
- "Picked because your profile and latest scan suggest dryness plus barrier sensitivity, so this favors ceramide and barrier-repair support."
- "Picked because your main need is texture support, but your profile also suggests sensitivity, so this favors gentler smoothing over a harsher exfoliant."

Bad examples:
- "This is a great product."
- "It matches your search."
- "This is popular and well reviewed."
- "This may work for your skin."

FINAL INSTRUCTION

Choose the strongest hero and strongest alternatives for THIS user.
Do not choose random generic category matches.
Do not choose filler.
Pick as if trust and recommendation quality are the whole product.
`;
var PRODUCT_RECOMMENDATION_PLANNER_SYSTEM_PROMPT = `
You are the recommendation planner for a skincare product app.

Your job is to create the best possible product recommendation plan for one specific user.
You are not selecting final products yet.
You are deciding WHAT TYPES OF PRODUCTS this user should be shown and WHY.

You will receive:
- the user's query or request
- the user's skin type
- the user's sensitivities
- the user's top concerns
- the user's goals
- the user's latest scan summary
- any derived skin-profile flags already available

Your output must be a structured recommendation plan.
Do not output fake brands or fake products.
Do not output prose paragraphs.
Do not output generic shopping advice.

PRIMARY OBJECTIVE

Create a plan that would lead to the strongest possible product recommendations for THIS user.
Your plan must feel personalized, selective, and high-confidence.
Do not make a generic category plan.
Do not make a filler plan.
Do not make the same plan for every user.

HOW TO THINK

Infer the user's dominant needs first.
Examples:
- oily + breakout-prone + clogged => lightweight non-comedogenic hydration, blemish-safe support
- dry + barrier-compromised + sensitive => barrier repair, ceramide support, fragrance-free hydration
- redness + sensitivity => calming, soothing, fragrance-free support
- dark spots + texture => smoothing / resurfacing support, but sensitivity-aware
- vague "best for my skin" => infer the single dominant need first, then secondary needs

SELECTION RULES

A strong plan:
- is specific to the user's skin profile
- reflects the user's query
- reflects the latest scan summary
- avoids conflicts with sensitivities
- avoids generic filler product directions
- prioritizes what matters most, not everything at once

A weak plan:
- is generic
- repeats the same moisturizer/serum plan for every user
- ignores sensitivities
- ignores scan context
- spreads attention across too many categories with no clear main need

MOISTURIZER RULES

If moisturizer-family support is relevant:
- oily / acne-prone / breakout-prone => plan for lightweight, gel, oil-free, non-comedogenic hydration
- dry / barrier-compromised => plan for ceramide, barrier-repair, richer hydration support
- sensitive / redness-prone => plan for fragrance-free, calming, soothing, cica/centella support
- combination => plan for balanced lightweight hydration

Do not plan a random generic moisturizer for every user.

SMOOTHING / EXFOLIANT RULES

If smoothing / texture / exfoliation is relevant:
- choose direction based on sensitivity and barrier strength
- sensitive or redness-prone users should skew gentler
- do not over-aggressively plan harsh exfoliation when the user profile suggests caution

BREAKOUT RULES

If breakout / pimple support is relevant:
- prioritize blemish-safe, acne-safe, non-comedogenic directions
- do not combine breakout support with obviously clogging or conflicting directions

OUTPUT STANDARD

Act as if this app is launching publicly tomorrow and users will immediately judge whether the plan feels intelligent or generic.
The plan must be meaningfully different for meaningfully different users.

Return a structured recommendation plan only.
`;
var PRODUCT_SLOT_SELECTOR_SYSTEM_PROMPT = `
You are the final product selector for a skincare product app.

You do not invent products.
You do not retrieve products.
You choose the best real candidate from a shortlist of already retrieved products for one slot in a recommendation plan.

You will receive:
- the user's skin profile
- the user's sensitivities
- the user's top concerns
- the user's latest scan summary
- the slot purpose
- slot must-have signals
- slot avoid signals
- real candidate products

PRIMARY OBJECTIVE

Choose the best real candidate for THIS slot and THIS user.
Do not choose a broad acceptable filler product.
Do not choose a candidate just because it matches the category.
Choose the strongest candidate for the slot's user-specific purpose.

PRIORITY ORDER

Rank candidates in this order:
1. fit to the slot purpose
2. fit to the user's skin type
3. fit to sensitivities / redness / breakout risk / barrier state
4. fit to top concerns and latest scan summary
5. texture / formula appropriateness
6. only after all of that, generic category relevance

NEGATIVE RULES

Reject candidates that:
- conflict with the user's skin profile
- violate avoid signals
- are generic filler with weak user-fit
- are merely category-correct but clearly weaker than another candidate

WHY PICKED RULE

The reason for the selected candidate must be concise, specific, and user-aware.
It must sound like an expert reason, not generic marketing copy.

Good example:
"Picked because this slot needs lightweight breakout-safe hydration and this candidate best fits oily breakout-prone skin without heavy occlusion."

Bad example:
"This is a great product."
"It matches the search."
"It is popular."

Return structured selection only.
`;
var PRODUCT_TYPED_SEARCH_SYSTEM_PROMPT = `
You are the typed-search intent planner for a skincare product app.

Your job is to convert one user search query into ONE dominant product-family search plan for that specific user.

You are NOT building a routine.
You are NOT building multiple slots.
You are NOT returning one product per category.
You are deciding the single dominant product family and the exact search direction for this query.

You will receive:
- the raw user query
- the user's skin type
- the user's sensitivities
- the user's top concerns
- the user's goals
- the user's latest scan summary
- any derived skin-profile flags already available

PRIMARY OBJECTIVE

For a typed search, choose the ONE dominant product family that best matches the user's search intent and skin needs.
Then generate a strong, user-specific search plan for that family only.

DO NOT produce a multi-slot plan.
DO NOT produce multiple categories unless the query truly requires one category family that overlaps conceptually.
DO NOT return a moisturizer + treatment + exfoliant bundle for a search query.
This is SEARCH, not a routine plan.

GOOD EXAMPLES

If the query is "moisture" or "moisturizer":
- dominantProductFamily = moisturizer
- the result should become a list of moisturizers appropriate for the user's skin

If the query is "chemical exfoliant":
- dominantProductFamily = chemical_exfoliant
- the result should become a list of exfoliation-relevant products only

If the query is "niacinamide serum":
- dominantProductFamily = serum_texture or blemish_support depending on user/context
- the result should become a list of relevant serums only

If the query is "best for my pimple":
- dominantProductFamily = blemish_support
- the result should become a list of blemish-supportive products only

HOW TO THINK

1. Infer the user's search intent from the query first.
2. Use skin type, sensitivities, goals, top concerns, and latest scan summary to personalize WITHIN that search family.
3. Return one dominant product family only.
4. Create a user-specific search plan for that family.

MOISTURIZER RULES

For oily / acne-prone / breakout-prone users:
- prefer lightweight, gel, oil-free, non-comedogenic hydration
- avoid heavy occlusive or rich barrier creams unless barrier repair clearly dominates

For dry / dehydrated / barrier-compromised users:
- prefer ceramide, barrier-repair, richer hydration
- avoid ultra-light gels if clearly too weak

For sensitive / redness-prone users:
- prefer fragrance-free, calming, soothing support
- avoid fragranced or harsh-active moisturizers

SMOOTHING / EXFOLIANT RULES

If the search is for smoothing / exfoliation:
- stay inside that family
- prefer gentler options when sensitivity/barrier weakness is present
- do not drift into random hydration-only products

BREAKOUT RULES

If the search is blemish/pimple-focused:
- stay inside blemish-support logic
- do not drift into unrelated hydration or exfoliation unless the query itself demands it

OUTPUT RULES

Return structured JSON only with:
- recommendationMode
- rawQuery
- normalizedQuery
- searchIntentLabel
- dominantProductFamily
- userNeedSummary
- mustHaveSignals
- avoidSignals
- preferredTextures
- searchQueries
- rankingPriorities

Do not output prose.
Do not output slots.
Do not output a routine.

USER-FACING SUMMARY RULES (userNeedSummary)

userNeedSummary is rendered DIRECTLY in the app under a "PICKED FOR THIS SEARCH" kicker. It is a single calm editorial caption shown to the end user. Treat it as final UI copy, not internal analysis.

Requirements:
- Maximum 110 characters. One sentence. Calm and concrete.
- Never start with "User needs", "The user", "User wants", "User is", "User has".
- No third-person clinical phrasing about the user.
- No medical or therapeutic claims ("cures", "treats", "clinically proven", "guaranteed", "dermatologist-verified").
- Do not use the word "verified" \u2014 the app does not verify products.
- No engineering or planner jargon ("intent", "user-need", "diagnosis", "matching pipeline").
- Skincare-safe verbs: "supports", "helps", "designed for", "good fit for", "selected for".
- Prefer the form: "Selected for X." / "Curated around X." / "Good fits for X." / "Closest catalog matches for X."

Good display examples:
- "Selected for smoother-looking texture and a gentler exfoliation profile."
- "Curated around lightweight, breakout-conscious hydration."
- "Good fits for barrier support and comfortable hydration."
- "Closest catalog matches for tone-supporting serums."

Bad examples (must NOT produce):
- "User needs gentle exfoliants\u2026"
- "The user is looking for\u2026"
- "Diagnosed with\u2026"
- "Verified matches\u2026"
- "Cures\u2026"
- "Guaranteed\u2026"

If you cannot produce a clean caption, return a short factual category line ("Curated picks for \${category}.") rather than third-person analysis text. The client also sanitizes and validates this field, so awkward output will be rejected and replaced.
`;
var OpenAIClient = class {
  openai;
  constructor(config) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error(
        "OpenAIClient: apiKey is required and must be non-empty."
      );
    }
    this.openai = new OpenAI({ apiKey: config.apiKey });
  }
  // --------------------------------------------------------------------------
  // Private helpers.
  // --------------------------------------------------------------------------
  /**
   * Build the user-message content array carrying an image + a
   * text instruction. Returns the array so callers may concatenate
   * additional context blocks before sending.
   */
  buildImageUserContent(imageBase64, mediaType, instruction) {
    return [
      {
        type: "image_url",
        image_url: {
          url: `data:${mediaType};base64,${imageBase64}`,
          detail: "auto"
        }
      },
      {
        type: "text",
        text: instruction
      }
    ];
  }
  /**
   * Run a strict structured-output call: one user message,
   * `response_format: json_schema (strict)`. Returns the parsed JSON
   * cast to T. Throws a typed AIError if the model returned non-JSON
   * or the content was empty.
   *
   * v18.8 — retries ONCE on empty-content failures. The model
   * occasionally returns finish_reason="length" + empty content
   * when the reasoning budget eats the output cap; on retry with
   * a doubled cap it almost always succeeds. Limits to one retry
   * to avoid runaway loops.
   */
  async runStrictStructured(params) {
    const baseMaxTokens = params.maxTokens ?? AI_DEFAULTS.extraction.max_tokens;
    const attempt = async (maxTokens, attemptIndex) => {
      const response = await this.openai.chat.completions.create({
        model: params.model ?? AI_MODELS.extraction,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: params.system },
          {
            role: "user",
            content: typeof params.userContent === "string" ? params.userContent : params.userContent
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: params.schemaName,
            strict: true,
            schema: toStrictSchema(params.schema)
          }
        }
      });
      const choice = response.choices[0];
      const text = choice?.message?.content;
      const finish = choice?.finish_reason ?? null;
      if (typeof text !== "string" || text.length === 0) {
        return {
          ok: false,
          reason: finish === "length" ? "length_cap" : "empty_content",
          finish
        };
      }
      try {
        return { ok: true, value: JSON.parse(text) };
      } catch {
        return { ok: false, reason: "parse_failed", finish };
      }
    };
    const first = await attempt(baseMaxTokens, 0);
    if (first.ok) return first.value;
    const secondCap = first.reason === "length_cap" ? Math.min(baseMaxTokens * 2, 16384) : baseMaxTokens;
    const second = await attempt(secondCap, 1);
    if (second.ok) return second.value;
    throw new AIError(second.reason, params.schemaName, second.finish);
  }
  // --------------------------------------------------------------------------
  // 0. Scan preflight (v11.7).
  //
  // Fast vision call that runs IMMEDIATELY after capture, before
  // analyzeFaceScan. Returns a tight structured judgement on whether
  // the photo is usable for the expensive analysis pass. Saves
  // tokens on obviously bad captures and powers the smart
  // condition-aware error UI in Expo Go (where we can't truthfully
  // pre-validate before capture).
  // --------------------------------------------------------------------------
  async validateScanPreflight(params) {
    const system = 'You are the face-scan preflight validator for Pura AI. Your job is fast: look at the supplied photo and decide whether it is usable for a structured skin analysis. You return EXACTLY the JSON object specified by the schema. No prose.\n\nCALIBRATION (read this first):\nYou are NOT a studio-photo gatekeeper. The downstream analyzer is robust to ordinary phone selfies. Default to `ok` for any photo where a human face is visibly readable, even if lighting is imperfect, the angle is slight, or the framing is not centered. Reserve a non-ok reason for cases where a reasonable person would also say "I cannot read this skin from this photo." Mild shadow, mild softness, slight crop, or slight off-center \u2192 return `ok`.\n\nField rules:\n\u2022 face_present \u2014 TRUE whenever a human face is visibly identifiable. Use FALSE only when no face is in the frame at all or the face is so obscured that a person could not point to it.\n\u2022 full_face_visible \u2014 TRUE if forehead, cheeks, and chin are mostly visible. A small crop at the top of the forehead or just under the chin is acceptable. Use FALSE only when a major facial region (whole forehead, an entire cheek, the whole chin) is missing.\n\u2022 centered_enough \u2014 TRUE for any face occupying a reasonable part of the frame. Slight off-center is fine. Only FALSE when the face is jammed into a corner or barely visible.\n\u2022 lighting_ok \u2014 TRUE for any photo a person could read. Mild shadow, indoor lighting, side light: all TRUE. Only FALSE for photos that are nearly black or so blown-out that no skin tone is readable.\n\u2022 blur_ok \u2014 TRUE for any photo where you can make out facial features. Slight softness is FINE. Only FALSE for severe motion blur or complete defocus.\n\u2022 face_box \u2014 when face_present is true, return the face bounding box normalised to [0, 1] over the photo width/height. When false, return null.\n\u2022 reason \u2014 return `ok` unless a field above is FALSE under the strict definitions just given. Priority for the single reason: no_face \u2192 partial_face \u2192 too_dark \u2192 too_blurry \u2192 not_centered \u2192 unknown. When in doubt, return `ok` and let the analyzer make the call.\n\u2022 retry_message \u2014 one short, calm, premium sentence the user reads on the retry screen ("Try again with your full face centered in the frame."). Empty string when reason is "ok".';
    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      "Validate this photo for a face-scan analysis and return the structured ScanPreflightResult."
    );
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "scan_preflight_result",
      schema: SCAN_PREFLIGHT_RESULT_SCHEMA,
      // v18.10 — bumped 1500 → 4096. v18.8's 1500 cap was still
      // hitting `finish_reason="length"` in the wild because
      // GPT-5-mini's reasoning tokens for an image-bearing call
      // consume far more budget than text-only calls. 4096 matches
      // the extraction default and gives the model enough room
      // for vision reasoning + the small structured payload.
      // Combined with the runStrictStructured retry envelope
      // (which doubles the cap on a length failure), preflight
      // empty-content responses should now be rare.
      maxTokens: 4096
    });
  }
  // --------------------------------------------------------------------------
  // 1. Face scan analysis.
  // --------------------------------------------------------------------------
  async analyzeFaceScan(params) {
    const system = 'You are the face scan analysis engine for Pura AI, a premium consumer skincare app. You read a single user-uploaded face photograph and return a structured, CONSERVATIVE skin reading.\n\nYou are not a medical device. You only describe visible cosmetic signals. When in doubt, surface less, never more.\n\nOutput rules:\n\u2022 Return EXACTLY the JSON object specified by the schema.\n\u2022 ALWAYS echo the `scan_id` value from the user message into the output exactly as given. Set `analyzed_at_iso` to the current UTC time in ISO-8601.\n\u2022 When previous_summary is "none", set delta_vs_previous and delta_vs_baseline to null.\n\u2022 score_factors must be 0..100 integers calibrated to the overall skin_score.value. Default toward 70-80 for a normal photo with no clearly visible problem on that axis.\n\nIMAGE_QUALITY FIELD CALIBRATION (critical \u2014 read carefully):\nYou return three fields under `image_quality`. Calibrate them honestly, but do NOT mistake ordinary phone-camera variance for unusability. An everyday indoor selfie is the BASELINE case, not the failure case. A reasonable person looking at a normal phone selfie would say "yes, I can read this skin" \u2014 so should you.\n\u2022 `image_quality.usable` \u2014 TRUE for any photo where a human face is readable. The bar is "could a person interpret skin from this photo?", NOT "is this studio quality?". Indoor lighting, mild shadow, slight angle, soft focus, or imperfect crop \u2192 still TRUE. Only return FALSE when the photo is effectively black, motion-blurred beyond facial-feature recognition, severely overexposed, or entirely missing a face.\n\u2022 `image_quality.confidence` \u2014 your trust that the visible-signal inferences in THIS response are well-grounded in the photo. Calibration:\n    0.85\u20130.95 = a clear well-lit selfie, full face visible.\n    0.65\u20130.85 = an ordinary phone selfie: indoor light, mild shadow, slight off-angle. THIS IS THE COMMON CASE.\n    0.45\u20130.65 = noticeably soft / partially shadowed / partial crop, but you can still read major facial zones.\n    0.25\u20130.45 = significant degradation, only some zones readable.\n    < 0.20 = the photo is essentially unreadable. Reserve for black frames, severe motion blur, or full-face occlusion.\n  DO NOT return confidence < 0.30 for a photo where you successfully extracted ANY visible finding \u2014 those two facts contradict each other.\n\u2022 `image_quality.issues` \u2014 populate ONLY for SEVERE conditions a reasonable person would also flag. Calibration:\n    `blurry` \u2014 only for severe motion blur or full defocus, NOT mild softness from a hand-held selfie.\n    `low_light` \u2014 only for near-black photos where skin tone is unreadable, NOT for normal indoor light or mild shadow.\n    `partial_face` \u2014 only when a MAJOR region (entire forehead, whole cheek, whole chin) is missing, NOT minor crop at the forehead top or under the chin.\n    `angled` \u2014 only for extreme profile, NOT slight off-axis.\n    `occluded` \u2014 only when hair / hand / object covers a large portion of the face, NOT a single stray strand.\n  For ordinary everyday selfies the correct value is an EMPTY array. Do NOT defensively populate this field \u2014 false positives force the user into a retake loop on perfectly readable photos. When in doubt, return [].\nCONSISTENCY RULE: if you return any findings, the photo is usable by definition \u2014 return `usable: true` and `confidence \u2265 0.30`.\n\nIMAGE-ANCHORED OVERLAY DATA (v17.0):\nYou MUST return `face_overlay` and per-finding `region_polygon` arrays. All coordinates are normalized 0..1 against the captured image dimensions (NOT against the face bounding box). Use top-left = (0,0), bottom-right = (1,1).\n\u2022 face_overlay.face_box: bounding box of the face in the image. Tight crop, not loose. If the face takes ~60% of the frame width centered, the box might be roughly {x: 0.20, y: 0.15, width: 0.60, height: 0.70}.\n\u2022 face_overlay.landmarks: real coordinates of the eyes (left, right), nose tip, mouth center, chin tip, and forehead center. Be accurate \u2014 these anchor the entire skin map. The forehead_center sits roughly halfway between the brows and the hairline.\n\u2022 Each finding MUST include a `region_polygon` array of 4-12 normalized {x,y} points outlining where you actually OBSERVE this concern in the image. Trace the visible region. For redness across the cheeks, draw a polygon over the affected cheek area. For breakouts, draw a small polygon clustering the visible spots. The polygon does NOT have to match the whole face_region enum \u2014 it can be tighter.\n\u2022 If a finding has no visually localizable region (e.g. an overall hydration impression), return a polygon covering the face area where the impression applies. Never return an empty array.\n\u2022 Polygons should be CLOCKWISE order from top-left.\n\n\u2022 SCORE DISCIPLINE: skin_score.value should sit in 72-86 for an ordinary clear photo with no obvious concerns. Reserve scores below 65 for photos with multiple high-confidence visible issues. Reserve scores above 90 for photos where the skin reads as exceptionally clear with no visible texture, redness, breakouts, or marks of any kind. Do not produce wide swings on routine photos.\n\nCALIBRATION (the most important rule set):\n\u2022 Only return a finding when the photograph SHOWS the issue. Do not infer from age, demographics, lighting, or generic expectations. If you cannot point to visible pixels supporting the finding, do not return it.\n\u2022 MILD findings are valid and IMPORTANT. Under-eye shadowing, faint fine lines, mild redness, light texture, small blemishes are all worth surfacing when they are visibly present. Do not suppress a real visible signal merely because it is mild \u2014 that eroded user trust in earlier builds.\n\u2022 If a region looks ordinary, the correct severity is "none". "Mild" means a visible signal is present but subtle.\n\u2022 Confidence reflects visual-evidence strength, not your classification certainty. A clearly visible mild signal can sit around 0.55\u20130.70. A clearly visible moderate signal sits around 0.70\u20130.85. Reserve 0.85+ for unambiguous moderate or pronounced signals. A signal you can barely make out sits around 0.40\u20130.50 (it will not display as a confirmed finding but still signals "a clearer scan may reveal more").\n\u2022 If image_quality is poor (blurry / low light / angled / partial / occluded), keep severity at "low" or "mild" and let confidence reflect the reduced visibility \u2014 do not invent a hard cap.\n\u2022 When uncertain, return the finding at lower confidence rather than dropping it entirely. The frontend bands handle display thresholds (clear \u2265 0.72, supported \u2265 0.52, possible \u2265 0.38). Honest calibration there beats silent suppression.\n\u2022 A genuinely clean photo with no visible signals can return zero findings. Do not fabricate to fill the result.\n\u2022 marker_priority MUST be 0 (do not surface) for any finding with confidence < 0.52. Reserve 1 (primary) for the single highest-confidence visible concern.\n\nTONE (consumer copy, not clinical):\n\u2022 user_summary is ONE short sentence in calm, plain English. No medical framing. Examples: "Mild texture is visible across the forehead." / "Skin reads generally calm in this photo." / "Some congestion is faintly visible along the chin."\n\u2022 Use hedged language ("appears", "looks", "is visible") for mild findings. Reserve direct phrasing for moderate+ findings.\n\u2022 Never use clinical terms (acne, comedones, papules, inflammation, post-inflammatory hyperpigmentation). Use breakout / congestion / texture / dark mark / redness instead.\n\u2022 why_line is plain, \u2264 12 words: "Skin looks generally calm." or "Mild texture across the forehead." It sits under the score.\n\u2022 explanation is ONE concise sentence that supports the why_line without repeating it.\n\u2022 clinician_style_summary stays factual but ALSO consumer-safe ("faint texture, low confidence" / "no visible concerns").\n\nNEXT_FOCUS COPY:\n\u2022 next_focus.tonight is an array of 1\u20134 short, human-readable imperative sentences. NEVER return raw tokens or snake_case identifiers. Examples: "Apply a light hydrating serum." / "Use a gentle chemical exfoliant 1\u20132 nights per week." / "Spot-treat new blemishes only as they appear."\n\u2022 next_focus.avoid is the same \u2014 short, complete sentences. "Skip retinol tonight." / "Avoid abrasive scrubs while skin is sensitive."';
    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      [
        `scan_id: ${params.scanId}`,
        `user_profile: ${params.userProfileSummary}`,
        `previous_summary: ${params.previousSummary ?? "none"}`,
        "",
        "Analyze this face image and return the structured skincare analysis."
      ].join("\n")
    );
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "face_scan_analysis",
      schema: FACE_SCAN_ANALYSIS_SCHEMA,
      // v34.1 — bumped 4096 (extraction default) → 6144 to match the
      // V2 method's budget. The analyzeFaceScan output is the LARGEST
      // structured payload in the system: image_quality + skin_score +
      // primary/secondary_concerns + findings[] (each with a 4-12-point
      // region_polygon) + score_factors (8 axes) + next_focus +
      // plan_inputs + face_overlay (face_box + 5 landmark points).
      // Combined with gpt-5-mini's hidden reasoning tokens (which count
      // against the same `max_completion_tokens` budget) and the system
      // prompt's IMAGE_QUALITY calibration block, 4096 was producing
      // finish_reason="length" → empty content → AIError('length_cap')
      // → tryAi() → null → ScanServiceErrorScreen ("Analysis service
      // did not return a usable result"). 6144 + the runStrictStructured
      // retry-with-double envelope (caps at 12288) gives the worst-case
      // full-payload response enough room to complete.
      maxTokens: 6144
    });
  }
  // --------------------------------------------------------------------------
  // 1b. Scan result V2 — strict 3-to-6 findings.
  //
  // Different shape from analyzeFaceScan() — produces ScanResultV2 with
  // overall_score + score_breakdown + headline + summary + findings.
  // Forces the model to ALWAYS return between 3 and 6 findings. Empty
  // arrays are forbidden by schema + reinforced in the system prompt.
  // --------------------------------------------------------------------------
  async analyzeFaceScanV2(params) {
    const baseSystem = [
      "You are the Pura skin analysis engine \u2014 the most premium, trusted face-scan reader on the consumer market. You read a single user-uploaded face photograph and return a STRICT structured analysis.",
      "You are not a medical device. You describe visible cosmetic signals ONLY. Never diagnose. Never overstate. Never overclaim. When in doubt, lower confidence \u2014 do not invent.",
      "",
      "HARD OUTPUT RULES \u2014 the JSON schema enforces these, do not violate them:",
      "\u2022 Return BETWEEN 3 AND 6 `findings`. Empty arrays are FORBIDDEN.",
      "\u2022 Every finding MUST use a canonical `zone` id: forehead, glabella, left_temple, right_temple, left_undereye, right_undereye, left_crowsfeet, right_crowsfeet, nose_bridge, nose_tip, left_nasolabial, right_nasolabial, left_cheek, right_cheek, upper_lip, lower_lip, chin, jawline_left, jawline_right, neck.",
      "\u2022 Every finding MUST use a canonical `concern` id: fine_lines, wrinkles, dark_circles, puffiness, hyperpigmentation, redness, dryness, oiliness, texture, enlarged_pores, dullness, uneven_tone, blemishes, sun_damage, elasticity.",
      "\u2022 Every finding MUST include `confidence` (0..1) \u2014 your honest belief that this signal is actually visible in THIS photo. Mild but visible = 0.55-0.7. Clear = 0.75+. Subtle and uncertain = 0.4-0.55.",
      "",
      "VISIBILITY DISCIPLINE (this is the most important rule):",
      "\u2022 Only return a finding when YOU CAN POINT TO PIXELS supporting it. Do not infer from demographics, expected aging, or generic skincare wisdom.",
      "\u2022 Subtle visible cues ARE valid findings. Mild forehead texture, soft under-eye fatigue, faint nose-area redness, a single small active spot, mild dehydration cues, slight uneven tone \u2014 surface them when present.",
      '\u2022 Distinguish three states: (a) clearly visible \u2192 high-confidence finding; (b) subtle but visible \u2192 lower-confidence finding; (c) genuinely absent \u2192 no finding. NEVER claim "nothing stood out" if subtle signals are visible.',
      "\u2022 Healthy skin still produces findings: pore visibility in the T-zone, faint expression lines, mild luminosity variance, normal texture across the cheeks. These are observations, not problems.",
      "\u2022 Spread severity realistically across 1-5. Do NOT cluster all findings at severity 1. If forehead lines are obvious, that is 2 or 3.",
      "",
      "OVERALL SCORE CALIBRATION (0-100):",
      "\u2022 85-95 = excellent reading with only subtle observations.",
      "\u2022 70-84 = typical healthy skin with everyday signals.",
      "\u2022 55-69 = several visible concerns worth addressing.",
      "\u2022 Below 55 = multiple high-severity concerns.",
      "Sub-scores (hydration, texture, tone, clarity, vitality) calibrate to the findings.",
      "",
      "COPY RULES (premium, calm, consumer-friendly):",
      '\u2022 `headline` \u2014 ONE editorial sentence, \u2264 8 words. Warm, observational, never clinical. Examples: "Calm skin with light surface texture." / "Bright complexion, faint expression lines emerging."',
      "\u2022 `summary` \u2014 2-3 sentences, specific to the findings. No filler.",
      '\u2022 Each `finding.title` \u2014 3-5 words ("Faint forehead lines", "Mild T-zone shine", "Subtle under-eye softness").',
      "\u2022 `observation` \u2014 one sentence describing what is visible IN THIS PHOTO in this zone.",
      "\u2022 `recommendation` \u2014 one actionable cosmetic-care sentence. No diagnosis.",
      '\u2022 `ingredient_hints` \u2014 1-3 lowercase ingredient names ("niacinamide", "ceramides", "caffeine", "salicylic acid", "hyaluronic acid").',
      '\u2022 `id` \u2014 short stable slug, unique within this response (e.g. "forehead-texture", "left-undereye-fatigue").',
      "",
      "OVERLAYS (`overlays` array) \u2014 these are drawn on top of the user's real photo:",
      "\u2022 Return one overlay PER VISIBLE FOCUS \u2014 DO NOT overlay every finding. Skip overlays for findings that are abstract or low-confidence (< 0.5).",
      "\u2022 `zone` matches a finding's zone (or covers a paired bilateral zone, e.g. both undereyes).",
      "\u2022 `concern` matches the linked finding's concern.",
      '\u2022 `style` \u2014 choose tastefully: "soft_mask" for tonal/area concerns (dark_circles, redness, dryness, dullness), "heatmap" for diffuse signals (oiliness, hydration), "outline" for sharply bordered features (fine_lines, wrinkles), "pin" for localized spot concerns (blemishes, single sun_damage marks).',
      "\u2022 `opacity` \u2014 0.12 for mild, 0.22 for moderate, 0.32 for pronounced. Never above 0.40 (we never want to obscure the user's face).",
      "\u2022 `finding_id` \u2014 exact id of the linked finding.",
      "\u2022 If a concern is bilateral (both cheeks, both undereyes), emit TWO overlay entries (one per zone) so the rendering is symmetric.",
      "\u2022 Total overlays: 1-6. Quality over quantity.",
      "",
      "TOP_FOCUS_PRIORITY (`top_focus_priority` array):",
      "\u2022 1-4 finding ids, ordered most \u2192 least important.",
      "\u2022 Priority blends severity \xD7 confidence \xD7 how addressable the concern is.",
      "\u2022 The first id is the PRIMARY focus the user should care about most.",
      "",
      "INSIGHTS (`insights` array) \u2014 2-4 personalized, calm insight cards:",
      '\u2022 `title` \u2014 1-3 words ("Barrier support", "Gentle consistency", "Light hydration", "Daily protection", "Clarity boost", "Even tone").',
      "\u2022 `body` \u2014 one short calm sentence tied to the findings. No jargon.",
      "\u2022 `icon` \u2014 one of: barrier, hydration, clarity, tone, consistency, protection, gentle.",
      "\u2022 `related_finding_ids` \u2014 finding ids this insight grew out of (can be empty for general guidance).",
      '\u2022 Examples: "Your skin reads slightly dehydrated under the eyes \u2014 a humectant under moisturizer makes the biggest difference." / "Stay consistent and gentle \u2014 your barrier looks intact, and aggressive actives would set it back."',
      "",
      "ROUTINE_SEED (`routine_seed`) \u2014 the deterministic routine builder uses this as input:",
      '\u2022 `skin_needs` \u2014 1-5 short phrases the routine should address ("barrier support", "light hydration", "even tone", "calm redness", "oil control").',
      '\u2022 `avoid_tonight` \u2014 0-5 phrases the routine should AVOID tonight ("harsh actives", "physical scrubs", "high-strength retinol", "fragranced products"). When visible irritation, redness, or barrier stress is present, populate this defensively.',
      "\u2022 `recommended_step_types` \u2014 ordered subset of [cleanse, treat, moisturize, protect]. Cleanse + moisturize are almost always present. Include `treat` only when a finding genuinely calls for it. Include `protect` for any user (SPF in AM).",
      '\u2022 `intensity` \u2014 "gentle" if visible irritation / redness / sensitivity / low confidence; "moderate" for typical healthy skin; "active" only when multiple moderate+ findings (severity \u2265 3) co-exist AND no irritation is visible.',
      "\u2022 `step_taglines` \u2014 ONE specific, calm sentence per step type explaining WHY it sits in this routine, derived from THIS scan. Examples:",
      '    cleanse: "Gentle cream cleanser \u2014 keeps your barrier intact."',
      '    treat: "Lightweight serum targeting under-eye fatigue."',
      '    moisturize: "Ceramide-led hydration to support your skin barrier."',
      `    protect: "Daily SPF \u2014 your tone's best long-term ally."`,
      '  Do not say "Selecting step" or "Finding best match" or any generic copy.',
      "",
      "QUALITY (`quality`):",
      "\u2022 `usable` \u2014 true if any meaningful findings are extractable.",
      '\u2022 `mode` \u2014 "full" when face is centered, well-lit, sharp, and full. "limited" when ANY of: off-center, soft focus, partial shadowing, partial occlusion. Default to "full" when the photo is reasonable.',
      "\u2022 `score` \u2014 0..1 image quality confidence.",
      '\u2022 `reasons` \u2014 short reader-friendly notes only when mode = "limited" ("Soft focus on the lower face." / "Side-lit, right cheek partly shadowed."). Empty array when mode = "full".',
      "",
      "FORBIDDEN OUTPUTS:",
      "\u2022 Any finding without a visible pixel reference.",
      "\u2022 Empty findings array.",
      '\u2022 Generic step taglines ("Finding the best match", "Checking compatibility").',
      "\u2022 Medical terminology (acne, papules, comedones, post-inflammatory hyperpigmentation, dermatitis).",
      '\u2022 Diagnostic claims ("you have eczema").',
      "\u2022 Inventing concerns to fill the result."
    ].join("\n");
    const stricterAddendum = [
      "",
      "",
      "STRICTER RETRY \u2014 your previous output failed validation. Common failures:",
      "\u2022 Fewer than 3 findings.",
      "\u2022 Zone, concern, or icon outside the canonical enums.",
      "\u2022 Headline too long or empty.",
      "\u2022 Missing `ingredient_hints`, `confidence`, `overlays`, `top_focus_priority`, `insights`, `routine_seed`, or `quality`.",
      "\u2022 Generic step taglines.",
      "Re-emit a COMPLETE result with all required fields populated using only canonical enum values. This is the final attempt."
    ].join("\n");
    const system = params.stricterReminder ? baseSystem + stricterAddendum : baseSystem;
    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      [
        `scan_id: ${params.scanId}`,
        "",
        "Analyze this face photograph and return the full structured scan result: findings, overlays, top_focus_priority, insights, routine_seed, and quality. Return between 3 and 6 findings \u2014 never zero. Be specific to what you actually see."
      ].join("\n")
    );
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "scan_result_v2",
      schema: SCAN_RESULT_V2_SCHEMA,
      // v34 — richer payload (overlays + insights + routine_seed + quality)
      // can push the token budget higher than the lean 4096 default.
      // 6144 + the runStrictStructured retry-with-double envelope is the
      // safe headroom for the worst-case full-payload response.
      maxTokens: 6144
    });
  }
  // --------------------------------------------------------------------------
  // 2. Product image identification.
  // --------------------------------------------------------------------------
  async identifyProductFromImage(params) {
    const system = 'You are the product image identification engine for Pura AI. Your job is to look at a photograph of a skincare product (the bottle, tube, jar, or carton) and resolve its identity as specifically as possible from visible packaging.\n\nHard rules:\n\u2022 Return EXACTLY the JSON object specified by the schema.\n\u2022 Resolve as specifically as possible from visible text and design cues: brand wordmark, product name, claims, sizing, colour scheme.\n\u2022 If the exact identity is uncertain, set resolved=false but still return the strongest structured identity you can \u2014 partial brand, category guess, observed claims.\n\u2022 Set source="image" (this method never sees a barcode).\n\u2022 Do not hallucinate barcode_value \u2014 set it to null unless a barcode is clearly visible AND fully legible in the photo.\n\u2022 product_category should be the best fit; use "unknown" only when the image gives no signal.\n\u2022 likely_concerns_supported should reflect claims actually on the packaging (e.g. "salicylic acid" \u2192 breakouts; "ceramides" \u2192 sensitivity), not aspirational claims.\n\u2022 packaging_notes is free-text observations: colour, language, visible warnings, partial-text fragments.';
    const userContent = this.buildImageUserContent(
      params.imageBase64,
      params.mediaType,
      "Identify this product as specifically as the visible packaging allows and return the structured identity."
    );
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "product_identity",
      schema: PRODUCT_IDENTITY_SCHEMA
    });
  }
  // --------------------------------------------------------------------------
  // 3. Barcode resolution.
  //
  // Simpler than the legacy two-step tool loop: the server already
  // owns `lookupBarcode` (Open Beauty Facts + local catalog) so we
  // do that lookup synchronously in TypeScript and pass the result
  // straight to the model for normalization. One round-trip total.
  // --------------------------------------------------------------------------
  async normalizeBarcodeResolution(params) {
    let lookupResult = null;
    try {
      lookupResult = await params.lookupBarcode(params.barcodeValue);
    } catch {
      lookupResult = null;
    }
    const system = 'You are the barcode normalization engine for Pura AI. Convert the lookup output into a canonical BarcodeResolution object.\n\nHard rules:\n\u2022 Return EXACTLY the JSON object specified by the schema.\n\u2022 If the lookup failed (lookup_result is null), set fallback_needed=true, found=false, identity=null, and matched_catalog_product_id=null. Preserve the original barcode_value as supplied.\n\u2022 If the lookup succeeded, set found=true and build a complete ProductIdentity object with source="barcode" and confidence=0.95 unless the lookup is partial \u2014 in which case lower confidence and set fallback_needed=true.\n\u2022 Never invent data not present in the lookup. If the lookup omitted brand or product_name, leave those null.\n\u2022 Echo the original barcode_value exactly.';
    const userText = [
      `barcode_value: ${params.barcodeValue}`,
      `lookup_succeeded: ${lookupResult !== null}`,
      "lookup_result:",
      lookupResult ? JSON.stringify(lookupResult, null, 2) : "null",
      "",
      "Return the canonical BarcodeResolution."
    ].join("\n");
    return this.runStrictStructured({
      system,
      userContent: userText,
      schemaName: "barcode_resolution",
      schema: BARCODE_RESOLUTION_SCHEMA
    });
  }
  // --------------------------------------------------------------------------
  // 4. Product matching.
  // --------------------------------------------------------------------------
  async matchProductsForUser(params) {
    const system = `You are the product matching engine for Pura AI. You rank a fixed candidate set of skincare products against a single user's current skin state.

Hard rules:
\u2022 Return EXACTLY the JSON object specified by the schema.
\u2022 Rank ONLY the candidate products provided in candidate_products_json. Do not invent products. Every product_id you emit must exist in the candidate set.
\u2022 Use the user's skin state, sensitivities, and routine fit. A product that conflicts with a user sensitivity must score low and surface in avoid_if_tags.
\u2022 match_score must be an integer 0..100 calibrated within the candidate set: the best fit lands near 100, the worst near 20.
\u2022 match_band ("excellent" / "strong" / "fair" / "weak") must follow match_score thresholds: \u226585 excellent, 70-84 strong, 50-69 fair, <50 weak.
\u2022 primary_reasons: 1\u20133 short bullet phrases the UI surfaces on cards. Each reason names a concrete tie to the user state.
\u2022 top_pick_product_id is the highest-scoring product in matches.
\u2022 alternatives is a small set (\u22645) of next-best candidates the user might prefer if they decline the top picks.`;
    const userContent = [
      `user_id: ${params.userId}`,
      `based_on_scan_id: ${params.basedOnScanId ?? "null"}`,
      "skin_state_summary:",
      params.skinStateSummary,
      "",
      "candidate_products_json:",
      params.candidateProductsJson,
      "",
      "Rank the candidates and return the structured ProductMatchResult."
    ].join("\n");
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "product_match_result",
      schema: PRODUCT_MATCH_RESULT_SCHEMA,
      // v18.10 — explicit 6144 cap. The structured ProductMatchResult
      // for 24 candidates with reasons is large; the previous default
      // (4096) was hitting `finish_reason="length"` on real runs and
      // returning empty content. 6144 + the runStrictStructured
      // retry-with-double envelope ensures the call completes.
      maxTokens: 6144
    });
  }
  // --------------------------------------------------------------------------
  // 5. Routine recommendation.
  // --------------------------------------------------------------------------
  async generateRoutineRecommendation(params) {
    const system = `You are the routine planning engine for Pura AI. Build a concise, actionable routine grounded in the user's real scan findings and the products that have been matched to them.

Hard rules:
\u2022 Return EXACTLY the JSON object specified by the schema.
\u2022 Do NOT recommend any product that is not present in matched_products_json. linked_product_id must reference a product in that JSON, or be null for steps that are not tied to a specific product (e.g. "rinse with lukewarm water").
\u2022 Use the three slots correctly: morning is daytime defence (SPF closes the slot), evening is the repair window, saved_for_later is products the user might add later.
\u2022 step_order is 1-indexed within each slot and reflects the real application sequence (cleanser \u2192 serum \u2192 moisturizer \u2192 SPF).
\u2022 tonight_focus is one short sentence the TODAY card surfaces (e.g. "Skip actives tonight, calm the chin.")
\u2022 headline is short ("Tonight: barrier repair, no actives.").
\u2022 reminder_recommended=true when the user has at least one meaningful evening step that benefits from consistency.
\u2022 Respect existing_routine_json: if the user already uses a product, prefer keeping it over swapping unless the scan directly contradicts it.`;
    const userContent = [
      `based_on_scan_id: ${params.basedOnScanId ?? "null"}`,
      "scan_summary:",
      params.scanSummary,
      "",
      "matched_products_json:",
      params.matchedProductsJson,
      "",
      "existing_routine_json:",
      params.existingRoutineJson,
      "",
      "Return the structured RoutineRecommendation."
    ].join("\n");
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "routine_recommendation",
      schema: ROUTINE_RECOMMENDATION_SCHEMA,
      // v18.10 — explicit 6144 cap. The structured RoutineRecommendation
      // (morning + evening + saved_for_later RoutineAction arrays) has
      // historically hit `finish_reason="length"` on real runs at the
      // default 4096. 6144 + retry envelope eliminates the failure.
      maxTokens: 6144
    });
  }
  // --------------------------------------------------------------------------
  // 6. Skin score explanation.
  // --------------------------------------------------------------------------
  async explainSkinScore(params) {
    const system = 'You are the Skin Score explanation engine for Pura AI. Take a numeric score, the change since either the previous scan or the baseline, and the user\'s concern movements, and return a plain-English explanation.\n\nHard rules:\n\u2022 Return EXACTLY the JSON object specified by the schema.\n\u2022 ALWAYS echo the `score`, `delta_reference`, and `delta_value` values from the user message into the output exactly as given.\n\u2022 Never return a naked number without a reason. why_line names the concrete concern that moved ("Breakouts calming, hydration still needs work.").\n\u2022 short_status is \u2264 5 words ("Up 4 from your last scan.").\n\u2022 coach_line is one short imperative sentence the user can act on tonight.\n\u2022 band must follow the score thresholds: 85+ great, 70-84 good, 55-69 fair, <55 poor.\n\u2022 If delta_reference is "none", set delta_value to null and short_status to "Your first reading."';
    const userContent = [
      `score: ${params.score}`,
      `delta_reference: ${params.deltaReference}`,
      `delta_value: ${params.deltaValue ?? "null"}`,
      "concern_movements_json:",
      params.concernMovementsJson,
      "",
      "Return the structured SkinScoreExplanation."
    ].join("\n");
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "skin_score_explanation",
      schema: SKIN_SCORE_EXPLANATION_SCHEMA
    });
  }
  // --------------------------------------------------------------------------
  // 7. Progress explanation.
  // --------------------------------------------------------------------------
  async explainProgress(params) {
    const system = `You are the progress interpretation engine for Pura AI. Compare a user's day-1 baseline against their latest scan and return a user-facing summary of what improved, what worsened, and what stayed the same.

Hard rules:
\u2022 Return EXACTLY the JSON object specified by the schema.
\u2022 Be specific. Don't say "things are improving" when you can say "Breakouts moved from moderate to mild."
\u2022 strongest_improvement names a single concrete win.
\u2022 strongest_regression names the worst regression OR is null if nothing regressed.
\u2022 unchanged_summary names the categories holding steady in one short sentence.
\u2022 short_narrative is 2\u20133 sentences for the Progress hero.
\u2022 compare_caption is a short caption shown over the day-1-vs-today compare slider ("DAY 1 \u2192 DAY 14: clearer chin, brighter cheeks.").`;
    const userContent = [
      "baseline_summary:",
      params.baselineSummary,
      "",
      "latest_summary:",
      params.latestSummary,
      "",
      "concern_movements_json:",
      params.concernMovementsJson,
      "",
      "Return the structured ProgressExplanation."
    ].join("\n");
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "progress_explanation",
      schema: PROGRESS_EXPLANATION_SCHEMA
    });
  }
  // --------------------------------------------------------------------------
  // 8. Search suggestions.
  // --------------------------------------------------------------------------
  async buildSearchSuggestions(params) {
    const system = 'You generate AI-powered search suggestions for the Pura AI app. You return a short prefill placeholder, a small set of tap-to-search suggestion chips, and a small set of refinement chips, all grounded in the user\u2019s current state.\n\nHard rules:\n\u2022 Return EXACTLY the JSON object specified by the schema.\n\u2022 Suggestions must reflect the supplied context \u2014 do not produce generic filler ("best moisturizer", "skincare 101").\n\u2022 Each chip is a short search phrase (\u2264 4 words), not a sentence.\n\u2022 prefill_placeholder reads naturally inside an empty search field ("Try: gentle exfoliant for chin").\n\u2022 page_context controls voice: on "products" the chips lead the user toward catalog filters; on "assistant" they lead toward questions the user might ask.\n\u2022 3\u20135 suggestion_chips, 2\u20134 refinement_chips. No duplicates between the two arrays.';
    const userContent = [
      `page_context: ${params.pageContext}`,
      "latest_scan_summary:",
      params.latestScanSummary ?? "none",
      "",
      "routine_summary:",
      params.routineSummary,
      "",
      "Return the structured SearchSuggestionResult."
    ].join("\n");
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "search_suggestion_result",
      schema: SEARCH_SUGGESTION_RESULT_SCHEMA
    });
  }
  // --------------------------------------------------------------------------
  // 8b. v18.0 — Live product retrieval.
  //
  // Replaces the seed-catalog-as-primary-inventory pattern. This
  // method asks GPT to recommend REAL named skincare products for
  // either a free-text query or a scan-derived concern context.
  // GPT's training data IS the inventory — major brands, real
  // product names, real ingredient lists, claimed benefits. The
  // structured-output schema forces brand+name+category+reason on
  // every candidate so the client can render it with confidence.
  //
  // The model is INSTRUCTED to never fabricate URLs or prices when
  // it isn't confident — it must return null for those fields. The
  // client then renders a brand-wordmark placeholder + a search-on-
  // merchant CTA, never a fabricated brand site.
  // --------------------------------------------------------------------------
  async lookupLiveProducts(params) {
    const count = Math.max(1, Math.min(8, params.count ?? 4));
    const system = `You are Pura AI's live product retrieval engine. Return real, named, commercially available skincare products that fit the user query, in the supplied JSON schema. Choose from your knowledge of the global skincare market \u2014 no fabricated brands, no fictional SKUs, no placeholders. If you cannot honestly fill a slot, return fewer than ${count} candidates.

Per candidate:
\u2022 id: lowercase, hyphenated slug from brand+name ("the-ordinary-niacinamide-10-zinc-1"). No spaces.
\u2022 category: one of cleanser, toner, serum, moisturizer, spot_treatment, spf, mask, unknown.
\u2022 concernTags: 1\u20134 from breakouts, hydration, texture, dark_marks, redness, oiliness, sensitivity, pores.
\u2022 ingredientsHighlights: 2\u20135 hero actives with strength when known ("salicylic acid 2%", "niacinamide 10%", "ceramide-3").
\u2022 price: best estimate of typical US retail in USD as a number (e.g. 16, 32.99). Null only when you truly have no idea.
\u2022 shortDescription: \u2264120 chars, plain English. What it does.
\u2022 matchReason: \u2264100 chars, names the specific tie to the user concern. "2% salicylic acid targets clustered chin breakouts" beats "great product".
\u2022 matchScore: integer 0..100 calibrated within YOUR set. Best \u2248 95, weakest \u2248 65.

Editorial:
\u2022 Prefer brands a US/UK shopper recognizes (CeraVe, La Roche-Posay, The Ordinary, Beauty of Joseon, Paula's Choice, Kiehl's, COSRX, Supergoop, Naturium, Glow Recipe).
\u2022 Never two products from the same brand in the same category.
\u2022 If the query contains "SAFETY:", treat the suffix as a hard ranking bias toward gentle, fragrance-free, barrier-supportive options. Avoid retinoids, high-strength acids, and physical scrubs.

confidence: "high" when query was clear and matches are strong, "medium" when reasonable, "low" when speculative.

Echo the user query verbatim into the \`query\` field.`;
    const userContent = JSON.stringify({
      query: params.query,
      scan_context: params.scanContext ?? null,
      requested_count: count
    });
    const lean = await this.runStrictStructured({
      system,
      userContent,
      schemaName: "live_product_lookup_lean",
      schema: LIVE_PRODUCT_LOOKUP_LEAN_SCHEMA,
      // v19.14 — explicit non-reasoning model.
      model: "gpt-4o-mini",
      // v19.14 — 2048 → 1536. gpt-4o-mini doesn't burn reasoning
      // tokens, so the 600-800 output tokens fit comfortably in
      // 1536. Tighter cap = tighter latency tail.
      maxTokens: 1536
    });
    return lean;
  }
  // --------------------------------------------------------------------------
  // 8c. v19.18 — Product rerank (Step F).
  //
  // Takes a SHORT list of deterministic candidates + canonical
  // user/skin context and returns a tiny structured object:
  //   { heroId, alternativeIds, whyHeroFits }
  //
  // AI does NOT generate any product fields. AI only chooses
  // hero + reorders alternatives + writes ONE plain-English
  // sentence (≤100 chars) explaining why the hero fits this user.
  //
  // This is the ONLY remaining role for AI in the product
  // pipeline. If this call fails, the caller falls back to the
  // deterministic local-score order — the user still sees a
  // useful hero.
  // --------------------------------------------------------------------------
  async rerankProducts(params) {
    const system = PRODUCT_RERANK_SYSTEM_PROMPT;
    const trustById = /* @__PURE__ */ new Map();
    for (const t of params.trustScores ?? []) {
      trustById.set(t.id, { trust: t.trust, hasImage: t.hasImage });
    }
    const candidatesWithTrust = params.candidates.map((c) => {
      const t = trustById.get(c.id) ?? { trust: 50, hasImage: false };
      return {
        ...c,
        trust: t.trust,
        has_image: t.hasImage
      };
    });
    const userContent = JSON.stringify({
      candidates: candidatesWithTrust,
      profile: params.profile,
      primary_concern: params.primaryConcern,
      severity_band: params.severityBand,
      intent: params.intentLabel,
      raw_query: params.rawQuery ?? null,
      chip_intent: params.chipIntent ?? null,
      interpreted_intent: params.interpretedIntent ?? null,
      latest_scan_summary: params.latestScanSummary ?? null,
      top_concerns: params.topConcerns ?? [],
      // v19.36 — skin-profile axes the prompt must honor.
      skin_profile: params.skinProfile ?? null
    });
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "product_rerank",
      schema: PRODUCT_RERANK_SCHEMA,
      // gpt-4o-mini for the same reason as lookupLiveProducts —
      // small, fast, deterministic for tiny structured output.
      model: "gpt-4o-mini",
      // Tiny output: ~30-50 tokens. 512 cap with safe headroom.
      maxTokens: 512
    });
  }
  // --------------------------------------------------------------------------
  // 8d. v19.43 — AI-FIRST PRODUCT RECOMMENDATION PLANNER.
  //
  // The planner stage. AI is now the recommendation engine, not just
  // a reranker. Given the user's full canonical context + the active
  // query (or "best for me" intent), the model returns a structured
  // ProductRecommendationPlan: which product types to show, what
  // signals each one should favor or avoid, and which concrete
  // retrieval queries should be used to enrich each slot.
  //
  // Retrieval then enriches each slot into a real product card. AI
  // does not invent products — every visible product is a real
  // backend-resolved candidate.
  // --------------------------------------------------------------------------
  async recommendProductsForUser(params) {
    const system = PRODUCT_RECOMMENDATION_PLANNER_SYSTEM_PROMPT;
    const userContent = JSON.stringify({
      query: params.query,
      profile: params.profile,
      top_concerns: params.topConcerns,
      latest_scan_summary: params.latestScanSummary,
      skin_profile: params.skinProfile ?? null,
      suggested_mode: params.suggestedMode ?? "best_for_you"
    });
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "product_recommendation_plan",
      schema: PRODUCT_RECOMMENDATION_PLAN_SCHEMA,
      // Non-reasoning model. Tight tail.
      model: "gpt-4o-mini",
      // Up to 4 slots × ~100 tokens + overhead ≈ ~500 tokens output.
      // 1024 cap with headroom for the retry envelope.
      maxTokens: 1024
    });
  }
  // --------------------------------------------------------------------------
  // 8e. v21.0 — AI SLOT SELECTOR.
  //
  // After the planner produces slots and retrieval enriches each
  // slot into a shortlist of real candidates, this method picks the
  // best real candidate per slot. AI does NOT invent products.
  // Returns one SlotSelection per slot referencing a real candidate
  // id from the input shortlist.
  // --------------------------------------------------------------------------
  async selectProductForSlot(params) {
    const system = PRODUCT_SLOT_SELECTOR_SYSTEM_PROMPT;
    const userContent = JSON.stringify({
      profile: params.profile,
      top_concerns: params.topConcerns,
      latest_scan_summary: params.latestScanSummary,
      skin_profile: params.skinProfile ?? null,
      slot_shortlists: params.slotShortlists
    });
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "slot_selection_result",
      schema: SLOT_SELECTION_RESULT_SCHEMA,
      model: "gpt-4o-mini",
      // ~4 slots × ~80 tokens + overhead ≈ ~400. 1024 with headroom.
      maxTokens: 1024
    });
  }
  // --------------------------------------------------------------------------
  // 8f. v22.1 — TYPED-SEARCH PLANNER.
  //
  // Used ONLY for typed product search. Returns ONE dominant product
  // family + a flat single-family search plan. NOT a slot plan, NOT a
  // routine builder. The engine retrieves real products using
  // `searchQueries`, filters to `dominantProductFamily`, ranks flat,
  // and returns a search-result-style list.
  // --------------------------------------------------------------------------
  async planTypedSearch(params) {
    const system = PRODUCT_TYPED_SEARCH_SYSTEM_PROMPT;
    const userContent = JSON.stringify({
      raw_query: params.rawQuery,
      profile: params.profile,
      top_concerns: params.topConcerns,
      latest_scan_summary: params.latestScanSummary,
      skin_profile: params.skinProfile ?? null
    });
    return this.runStrictStructured({
      system,
      userContent,
      schemaName: "search_intent_plan",
      schema: SEARCH_INTENT_PLAN_SCHEMA,
      model: "gpt-4o-mini",
      // ~12 fields × ~30 tokens + overhead ≈ ~400. 768 with headroom.
      maxTokens: 768
    });
  }
  // --------------------------------------------------------------------------
  // 9. Assistant freeform answer.
  //
  // Uses the stronger reasoning model for grounded answers. NOT
  // structured output — the assistant returns plain prose. The
  // entire assistant_context is JSON-stringified into the user
  // message so the model has the full grounding surface.
  // --------------------------------------------------------------------------
  async answerAssistant(params) {
    const system = `You are the in-app AI skincare assistant for Pura AI. You answer the user's questions using the structured context they have provided about their latest scan, routine, products, and progress.

Format (v14.1, mobile chat surface \u2014 TIGHTER than v11.3):
\u2022 Lead with the answer in ONE short sentence (\u2264 18 words).
\u2022 Then AT MOST 2 short bullets, \u2264 12 words each. Use a leading "\u2022 " on its own line.
\u2022 Hard cap: ~50 words total. Only exceed when the user explicitly asked for depth ("explain", "walk me through", "in detail").
\u2022 If the question is product-shaped ("what should I add", "best moisturizer", "what helps redness", a question that mentions an ingredient or product category), output ONE short lead sentence ONLY. Hard cap: \u2264 22 words. No bullets, no second sentence, no list. The app renders real product cards with brand, name, match %, price, and Shop button directly under your text \u2014 your job is the lead-in only, not the recap. Name the type of product (e.g. "a salicylic acid serum" or "a barrier-repair moisturizer") tied to the user's actual concern from latest_scan if present. Never name specific brands or product names \u2014 the cards do that.
\u2022 No greetings, no "Great question", no preamble. Lead with the answer.
\u2022 No headings, no markdown bold, no code fences, no JSON.

Voice:
\u2022 Specific to the latest scan, routine, products, and progress in the context. Reference at least one concrete piece of that context (a zone, product, or score) by name.
\u2022 If a piece of context is missing, say so briefly ("I don't have a recent scan yet \u2014 ") and continue helpfully with what you do have.
\u2022 Do not invent products that are not in top_matches or active_product_identity. When asked for general options, name categories ("a salicylic acid cleanser") rather than fictional specific products.

PROFILE-AWARE QUESTIONS (v19.11 \u2014 non-negotiable):
\u2022 When the user asks for their name ("what's my name", "who am I", "do you know my name"), look at assistant_context.user_profile.display_name. If it is a non-empty string, answer with that name verbatim \u2014 natural, short, no greetings: "Your saved name is Alex." or "I have you on file as Alex." If it is null, say honestly: "I don't have a saved name on file \u2014 you can set one in your profile." NEVER invent a name. NEVER answer with a scan id, a random word, or "I don't know" when display_name IS present.
\u2022 When the user asks profile-shaped questions ("what's my skin type", "what are my goals", "what concerns am I tracking"), answer from user_profile, latest_scan, and routine_snapshot. Be specific: name the concern from latest_scan.primary_concern, cite the score from latest_score.value, name actual product ids from routine_snapshot. If a field is missing, say it plainly (e.g. "I don't have a saved skin type yet").

SAFETY (v18.9 \u2014 non-negotiable):
\u2022 Inspect user_profile.sensitivities. If ANY entry starts with "safety_bias:" / "condition:" / "avoid_category:" / "avoid_ingredient:" / "safety_summary:", the user has flagged a skin condition, active irritation, prescription use, pregnancy/breastfeeding caution, or specific ingredient avoidances.
\u2022 When safety_bias is "moderate" or "high", lead the answer with one short, calm acknowledgment ("Because you marked sensitive/reactive skin, I prioritized gentler options.") and then name a GENTLE product class (a barrier-repair cream, a fragrance-free moisturizer, a low-strength azelaic acid). Never recommend strong acids, high-strength retinoids, or physical scrubs in this case.
\u2022 When a "condition:" tag is present (rosacea, eczema, dermatitis, psoriasis, melasma, acne_treatment), do NOT diagnose, do NOT use medical absolutes, do NOT claim to treat or cure. Frame everything as gentle support: "for reactive skin, a fragrance-free ceramide cream tends to feel calmer."
\u2022 When pregnancy_caution is high, never casually surface retinoids or high-strength salicylic acid. Suggest checking with their clinician for ingredient-specific questions.
\u2022 If the user asks something that sounds like a treatment / medical question, answer carefully: "Pura AI gives skincare guidance, not medical advice \u2014 for [condition] specifically, check with your dermatologist." Then offer one supportive product-class suggestion.
\u2022 Never imply the scan diagnoses a medical condition.`;
    const payload = {
      assistant_context: params.context,
      user_question: params.userQuestion
    };
    const response = await this.openai.chat.completions.create({
      model: AI_MODELS.assistant,
      max_completion_tokens: AI_DEFAULTS.assistant.max_tokens,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    });
    const choice = response.choices[0];
    const text = choice?.message?.content;
    const finish = choice?.finish_reason ?? null;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new AIError(
        finish === "length" ? "length_cap" : "empty_content",
        "answerAssistant",
        finish
      );
    }
    return text;
  }
  // --------------------------------------------------------------------------
  // 10. Composite — analyse a scanned product against the current user.
  // --------------------------------------------------------------------------
  async analyzeScannedProductAgainstUser(params) {
    const identity2 = await this.identifyProductFromImage({
      imageBase64: params.imageBase64,
      mediaType: params.mediaType
    });
    const candidate = {
      product_id: identity2.catalog_lookup_key ?? identity2.canonical_title ?? "scanned-product",
      brand: identity2.brand,
      product_name: identity2.product_name,
      canonical_title: identity2.canonical_title,
      product_category: identity2.product_category,
      likely_concerns_supported: identity2.likely_concerns_supported,
      key_claims: identity2.key_claims,
      packaging_notes: identity2.packaging_notes
    };
    const candidateProductsJson = JSON.stringify([candidate]);
    const fit = await this.matchProductsForUser({
      userId: "current_user",
      basedOnScanId: null,
      skinStateSummary: params.userContextSummary,
      candidateProductsJson
    });
    return { identity: identity2, fit };
  }
  // --------------------------------------------------------------------------
  // 11. Composite — full scan → plan bundle.
  // --------------------------------------------------------------------------
  async buildFullScanToPlanBundle(params) {
    const analysis = await this.analyzeFaceScan({
      imageBase64: params.imageBase64,
      mediaType: params.mediaType,
      scanId: params.scanId,
      previousSummary: params.previousSummary,
      userProfileSummary: params.userProfileSummary
    });
    const skinStateSummary = JSON.stringify({
      skin_score: analysis.skin_score,
      primary_concern: analysis.primary_concern,
      secondary_concerns: analysis.secondary_concerns,
      findings: analysis.findings,
      score_factors: analysis.score_factors,
      plan_inputs: analysis.plan_inputs
    });
    const concernMovementsJson = JSON.stringify({
      findings: analysis.findings.map((f) => ({
        concern: f.concern,
        severity: f.severity,
        direction_vs_previous: f.direction_vs_previous
      })),
      score_factors: analysis.score_factors
    });
    const [matches, score] = await Promise.all([
      this.matchProductsForUser({
        userId: "current_user",
        basedOnScanId: analysis.scan_id,
        skinStateSummary,
        candidateProductsJson: params.candidateProductsJson
      }),
      this.explainSkinScore({
        score: analysis.skin_score.value,
        deltaReference: analysis.skin_score.delta_vs_previous !== null ? "previous_scan" : analysis.skin_score.delta_vs_baseline !== null ? "baseline" : "none",
        deltaValue: analysis.skin_score.delta_vs_previous ?? analysis.skin_score.delta_vs_baseline ?? null,
        concernMovementsJson
      })
    ]);
    const matchedProductsJson = JSON.stringify({
      top_pick_product_id: matches.top_pick_product_id,
      matches: matches.matches,
      alternatives: matches.alternatives
    });
    const routine = await this.generateRoutineRecommendation({
      scanSummary: skinStateSummary,
      matchedProductsJson,
      existingRoutineJson: params.existingRoutineJson,
      basedOnScanId: analysis.scan_id
    });
    return { analysis, matches, routine, score };
  }
  // --------------------------------------------------------------------------
  // 12. Composite — progress bundle.
  // --------------------------------------------------------------------------
  async buildProgressBundle(params) {
    const [progress, score] = await Promise.all([
      this.explainProgress({
        baselineSummary: params.baselineSummary,
        latestSummary: params.latestSummary,
        concernMovementsJson: params.concernMovementsJson
      }),
      this.explainSkinScore({
        score: params.score,
        deltaReference: params.deltaValue !== null ? "baseline" : "none",
        deltaValue: params.deltaValue,
        concernMovementsJson: params.concernMovementsJson
      })
    ]);
    return { progress, score };
  }
};
function createOpenAIClientFromEnv() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error(
      "createOpenAIClientFromEnv: OPENAI_API_KEY is missing or blank."
    );
  }
  return new OpenAIClient({ apiKey });
}

// server/lib/searchProducts.ts
var OBF_SEARCH_URL = "https://world.openbeautyfacts.org/cgi/search.pl";
var OBF_TIMEOUT_MS = 5e3;
var DEFAULT_PAGE_SIZE = 12;
var USER_AGENT = "PuraAI-Server/19.25 (https://pura.app)";
var COSMETIC_CATEGORY_PATTERNS = [
  /cosmetic/i,
  /skincare/i,
  /skin care/i,
  /beauty/i,
  /serum/i,
  /cleanser/i,
  /moisturi[sz]er/i,
  /sunscreen/i,
  /toner/i,
  /face care/i
];
var CATEGORY_MAP = [
  [/cleanser|wash|foam|micellar/i, "cleanser"],
  [/serum|essence|ampoule|booster/i, "serum"],
  [/moisturi[sz]er|cream|lotion|emulsion/i, "moisturizer"],
  [/sun ?(screen|cream)|spf|sunblock/i, "spf"],
  [/toner|tonique/i, "toner"],
  [/mask|masque/i, "mask"],
  [/spot|treatment|acid/i, "spot_treatment"]
];
var CONCERN_KEYWORDS = {
  breakouts: ["salicylic", "bha", "azelaic", "benzoyl", "breakout", "acne"],
  redness: ["redness", "rosacea", "centella", "cica", "soothing", "calm"],
  hydration: ["hyaluronic", "glycerin", "ceramide", "moisturi", "hydrat"],
  texture: ["glycolic", "lactic", "aha", "pha", "retinol", "resurfacing"],
  dark_marks: ["vitamin c", "ascorbic", "tranexamic", "brighten"],
  oiliness: ["niacinamide", "mattifying", "oil control"],
  sensitivity: ["sensitive", "gentle", "fragrance-free", "panthenol"],
  pores: ["pore", "minimizing", "tightening"]
};
var SAFETY_TAG_PATTERNS = [
  [/fragrance[- ]?free|sans parfum/i, "fragrance_free"],
  [/alcohol[- ]?free|sans alcool/i, "alcohol_free"],
  [/sulfate[- ]?free/i, "sulfate_free"],
  [/silicone[- ]?free/i, "silicone_free"],
  [/paraben[- ]?free/i, "paraben_free"],
  [/cruelty[- ]?free/i, "cruelty_free"],
  [/vegan/i, "vegan"]
];
function inferCategory(categories) {
  if (!categories) return null;
  for (const [re, cat] of CATEGORY_MAP) {
    if (re.test(categories)) return cat;
  }
  return null;
}
var SKINCARE_NAME_PATTERNS = [
  /serum/i,
  /cleanser/i,
  /toner/i,
  /moisturi[sz]er/i,
  /cream/i,
  /barrier cream/i,
  /gel cream/i,
  /face cream/i,
  /body cream/i,
  /lotion/i,
  /emulsion/i,
  /balm/i,
  /sunscreen|spf/i,
  /mask|masque/i,
  /essence/i,
  /ampoule/i,
  /eye cream|eye serum/i,
  /exfoli/i,
  /retinol|retinal|tretinoin/i,
  /niacinamide/i,
  /hyaluronic/i,
  /vitamin c|ascorbic/i,
  /salicylic|glycolic|lactic|mandelic/i,
  /ceramide|squalane|panthenol|centella|cica/i
];
var MOISTURIZER_INGREDIENT_HINTS = [
  /glycerin/i,
  /hyaluronic acid|sodium hyaluronate/i,
  /ceramide/i,
  /panthenol/i,
  /squalane/i,
  /shea butter/i,
  /niacinamide/i
];
function looksLikeCosmetic(p) {
  const cats = p.categories ?? "";
  if (cats.length > 0) {
    if (COSMETIC_CATEGORY_PATTERNS.some((re) => re.test(cats))) {
      return true;
    }
  }
  const name = (p.product_name_en || p.product_name || p.generic_name || "").trim();
  if (name.length === 0) return false;
  if (!p.brands || p.brands.trim().length === 0) return false;
  if (SKINCARE_NAME_PATTERNS.some((re) => re.test(name))) return true;
  const looksLikeCreamFamily = /\b(cream|lotion|emulsion|balm|gel)\b/i.test(name);
  if (looksLikeCreamFamily) {
    const ingredients = (p.ingredients_text_en || p.ingredients_text || "").toLowerCase();
    if (ingredients.length > 0 && MOISTURIZER_INGREDIENT_HINTS.some((re) => re.test(ingredients))) {
      return true;
    }
    if (p.image_url || p.image_small_url) return true;
  }
  return false;
}
function pickPrimaryBrand(brands) {
  if (!brands) return "";
  const first = brands.split(",")[0]?.trim() ?? "";
  if (first.length === 0) return "";
  return first.replace(/\b\w/g, (c) => c.toUpperCase());
}
function deriveConcernTags(p) {
  const corpus = [
    p.product_name ?? "",
    p.product_name_en ?? "",
    p.generic_name ?? "",
    p.categories ?? "",
    p.ingredients_text ?? "",
    p.ingredients_text_en ?? ""
  ].join(" ").toLowerCase();
  const tags = [];
  for (const concern of Object.keys(CONCERN_KEYWORDS)) {
    if (CONCERN_KEYWORDS[concern].some((kw) => corpus.includes(kw))) {
      tags.push(concern);
    }
  }
  return tags;
}
function deriveSafetyTags(p) {
  const corpus = [
    p.labels ?? "",
    p.ingredients_text ?? "",
    p.ingredients_text_en ?? "",
    ...p.labels_tags ?? []
  ].join(" ").toLowerCase();
  const tags = [];
  for (const [re, tag] of SAFETY_TAG_PATTERNS) {
    if (re.test(corpus)) tags.push(tag);
  }
  return tags;
}
var BRAND_DTC = {
  "the ordinary": { host: "theordinary.com", merchant: "The Ordinary" },
  "the inkey list": { host: "theinkeylist.com", merchant: "The Inkey List" },
  cerave: { host: "cerave.com", merchant: "CeraVe" },
  "la roche-posay": { host: "laroche-posay.us", merchant: "La Roche-Posay" },
  "paula's choice": { host: "paulaschoice.com", merchant: "Paula's Choice" },
  cosrx: { host: "cosrx.com", merchant: "COSRX" },
  "beauty of joseon": {
    host: "beautyofjoseon.com",
    merchant: "Beauty of Joseon"
  },
  "kiehl's": { host: "kiehls.com", merchant: "Kiehl's" },
  supergoop: { host: "supergoop.com", merchant: "Supergoop!" },
  glossier: { host: "glossier.com", merchant: "Glossier" },
  fenty: { host: "fentyskin.com", merchant: "Fenty Skin" },
  innisfree: { host: "innisfree.com", merchant: "innisfree" },
  laneige: { host: "laneige.com", merchant: "LANEIGE" }
};
function deriveMerchant(brand, name) {
  const dtc = BRAND_DTC[brand.trim().toLowerCase()];
  if (dtc) {
    return {
      productUrl: `https://www.${dtc.host}/`,
      merchantName: `${dtc.merchant} (DTC)`
    };
  }
  const q = encodeURIComponent(`${brand} ${name}`);
  return {
    productUrl: `https://www.sephora.com/search?keyword=${q}`,
    merchantName: "Sephora (search)"
  };
}
var NOISY_IMAGE_PATTERNS = [
  // Marketplace / seller-shot indicators in URL paths.
  /amazon\.com\/images\/I\//i,
  /ebay/i,
  /aliexpress|alibaba/i,
  /walmartimages/i,
  /etsystatic/i,
  /shopify\.com\/s\//i,
  // some shopify product URLs are seller-uploaded
  // Generic noisy patterns.
  /collage|combo|set-of|bundle|gift-set/i,
  /placeholder|missing|invalid/i
];
var OBF_CANONICAL_PACKSHOT = /openbeautyfacts\.org\/images\/products\/.+\.(jpe?g|png|webp)(?:\?|$)/i;
function pickBestImageUrl(p) {
  const ordered = [];
  if (typeof p.image_url === "string" && p.image_url.trim().length > 0) {
    const u = p.image_url.trim();
    ordered.push({
      url: u,
      tier: OBF_CANONICAL_PACKSHOT.test(u) ? "high" : "medium",
      src: "image_url"
    });
  }
  if (typeof p.image_small_url === "string" && p.image_small_url.trim().length > 0) {
    ordered.push({
      url: p.image_small_url.trim(),
      // v21.2 — `image_small_url` is never HIGH (it's the smaller
      // crop). Best case is MEDIUM.
      tier: "medium",
      src: "image_small_url"
    });
  }
  if (typeof p.image_thumb_url === "string" && p.image_thumb_url.trim().length > 0) {
    ordered.push({
      url: p.image_thumb_url.trim(),
      tier: "low",
      src: "image_thumb_url"
    });
  }
  for (const c of ordered) {
    if (!/^https?:\/\//i.test(c.url)) continue;
    if (/\/invalid|placeholder|missing/i.test(c.url)) continue;
    const noisy = NOISY_IMAGE_PATTERNS.some((re) => re.test(c.url));
    let tier = c.tier;
    let reason = "";
    if (noisy) {
      tier = c.tier === "high" ? "medium" : "low";
      reason = `${c.src} (downgraded \u2014 marketplace-noisy URL)`;
    } else if (c.tier === "high") {
      reason = "image_url (clean packshot)";
    } else if (c.tier === "medium") {
      reason = "image_small_url (medium packshot, image_url missing)";
    } else {
      reason = "image_thumb_url (thumb only \u2014 low fidelity)";
    }
    return { url: c.url, quality: tier, reason };
  }
  return { url: null, quality: null, reason: "no usable image" };
}
function extractIngredientHighlights(p) {
  const text = (p.ingredients_text_en || p.ingredients_text || "").trim();
  if (text.length === 0) return [];
  return text.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length >= 3 && s.length <= 80).slice(0, 5);
}
function buildShortDescription(name, category, highlights) {
  const parts = [];
  if (category) parts.push(category);
  if (highlights.length > 0) {
    parts.push(`with ${highlights.slice(0, 2).join(", ")}`);
  }
  if (parts.length === 0) return name.slice(0, 140);
  return parts.join(" ").slice(0, 140);
}
function toCandidate(p) {
  const code = p.code ?? p._id ?? "";
  const name = (p.product_name_en || p.product_name || p.generic_name || "").trim();
  const brand = pickPrimaryBrand(p.brands);
  if (code.length === 0) return null;
  if (name.length === 0 || brand.length === 0) return null;
  const category = inferCategory(p.categories);
  const merchant = deriveMerchant(brand, name);
  const imagePick = pickBestImageUrl(p);
  const ingredientsHighlights = extractIngredientHighlights(p);
  const shortDescription = buildShortDescription(
    name,
    category,
    ingredientsHighlights
  );
  return {
    id: `be-${code}`,
    brand,
    name,
    merchantName: merchant.merchantName,
    productUrl: merchant.productUrl,
    imageUrl: imagePick.url,
    imageQuality: imagePick.quality,
    imageQualityReason: imagePick.reason,
    price: null,
    // OBF doesn't carry price data
    category,
    concernTags: deriveConcernTags(p),
    skinTypeTags: [],
    // OBF doesn't carry skin-type metadata
    safetyTags: deriveSafetyTags(p),
    ingredientsHighlights,
    shortDescription,
    source: "live_backend"
  };
}
async function fetchOBFSearch(query, pageSize) {
  const url = `${OBF_SEARCH_URL}?search_terms=${encodeURIComponent(query)}&page_size=${pageSize}&json=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT
      },
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`OBF HTTP ${res.status}`);
    }
    const body = await res.json();
    return Array.isArray(body.products) ? body.products : [];
  } finally {
    clearTimeout(timer);
  }
}
function coerceRequest(body) {
  const query = typeof body["query"] === "string" ? body["query"].trim() : "";
  const concernRaw = body["concern"];
  const concern = typeof concernRaw === "string" && concernRaw.length > 0 ? concernRaw : null;
  const skinTypeRaw = body["skinType"];
  const skinType = skinTypeRaw === "dry" || skinTypeRaw === "oily" || skinTypeRaw === "combination" || skinTypeRaw === "normal" || skinTypeRaw === "sensitive" ? skinTypeRaw : "unknown";
  const sensitivities = Array.isArray(body["sensitivities"]) ? body["sensitivities"].filter(
    (s) => typeof s === "string"
  ) : [];
  const limitRaw = body["limit"];
  const limit2 = typeof limitRaw === "number" && Number.isFinite(limitRaw) ? Math.max(1, Math.min(24, Math.round(limitRaw))) : DEFAULT_PAGE_SIZE;
  const triggerRaw = body["trigger"];
  const trigger = triggerRaw === "initial_load" || triggerRaw === "retry" || triggerRaw === "chip_press" || triggerRaw === "search" || triggerRaw === "assistant" || triggerRaw === "background" ? triggerRaw : "background";
  const goals = Array.isArray(body["goals"]) ? body["goals"].filter(
    (g) => typeof g === "string"
  ) : [];
  const latestScanSummaryRaw = body["latestScanSummary"];
  const latestScanSummary = typeof latestScanSummaryRaw === "string" && latestScanSummaryRaw.length > 0 ? latestScanSummaryRaw.slice(0, 320) : null;
  const topConcerns = Array.isArray(body["topConcerns"]) ? body["topConcerns"].filter(
    (c) => typeof c === "string"
  ) : [];
  const chipIntentRaw = body["chipIntent"];
  const chipIntent = typeof chipIntentRaw === "string" && chipIntentRaw.length > 0 ? chipIntentRaw : null;
  const intentRaw = body["interpretedIntent"];
  let interpretedIntent;
  if (intentRaw && typeof intentRaw === "object" && !Array.isArray(intentRaw)) {
    const r = intentRaw;
    const modeRaw = r["mode"];
    const mode = modeRaw === "concern_search" || modeRaw === "product_type_search" || modeRaw === "best_for_my_skin" || modeRaw === "vague_query" ? modeRaw : "vague_query";
    const ic = r["interpretedConcern"];
    const ipt = r["interpretedProductType"];
    const avs = r["avoidanceConstraints"];
    interpretedIntent = {
      mode,
      interpretedConcern: typeof ic === "string" ? ic : null,
      interpretedProductType: typeof ipt === "string" ? ipt : null,
      avoidanceConstraints: Array.isArray(avs) ? avs.filter(
        (x) => typeof x === "string"
      ) : []
    };
  }
  let probes;
  const probesRaw = body["probes"];
  if (Array.isArray(probesRaw)) {
    probes = probesRaw.filter((p) => !!p && typeof p === "object").map((p) => ({
      query: typeof p.query === "string" ? p.query.trim() : "",
      weight: typeof p.weight === "number" && Number.isFinite(p.weight) ? p.weight : 1,
      reason: typeof p.reason === "string" ? p.reason : ""
    })).filter((p) => p.query.length > 0).slice(0, 5);
    if (probes.length === 0) probes = void 0;
  }
  return {
    query,
    concern,
    skinType,
    sensitivities,
    limit: limit2,
    trigger,
    goals,
    latestScanSummary,
    topConcerns,
    chipIntent,
    interpretedIntent,
    probes
  };
}
async function searchProductsHandler(_client, body) {
  const req = coerceRequest(body);
  if (req.query.length === 0) {
    return {
      query: "",
      source: "empty",
      candidates: [],
      failureReason: null
    };
  }
  const probeList = req.probes && req.probes.length > 0 ? req.probes : [{ query: req.query, weight: 1, reason: "verbatim" }];
  const perProbeSize = Math.max(
    4,
    Math.floor((req.limit ?? DEFAULT_PAGE_SIZE) / Math.max(1, probeList.length))
  );
  const probeResults = await Promise.allSettled(
    probeList.map(async (probe) => ({
      probe,
      raw: await fetchOBFSearch(probe.query, perProbeSize)
    }))
  );
  const allFailures = [];
  const probeMatches = /* @__PURE__ */ new Map();
  const candidatesByCode = /* @__PURE__ */ new Map();
  for (const r of probeResults) {
    if (r.status === "rejected") {
      allFailures.push(
        r.reason instanceof Error ? r.reason.message : String(r.reason)
      );
      continue;
    }
    const { probe, raw } = r.value;
    for (const p of raw) {
      if (!looksLikeCosmetic(p)) continue;
      const c = toCandidate(p);
      if (!c) continue;
      const existing = candidatesByCode.get(c.id);
      const target = existing ?? c;
      if (!existing) {
        candidatesByCode.set(c.id, target);
      }
      const set = probeMatches.get(c.id) ?? /* @__PURE__ */ new Set();
      set.add(probe.query);
      probeMatches.set(c.id, set);
    }
  }
  if (allFailures.length === probeList.length && candidatesByCode.size === 0) {
    return {
      query: req.query,
      source: "error",
      candidates: [],
      failureReason: allFailures[0] ?? "all probes failed"
    };
  }
  const candidates = Array.from(
    candidatesByCode.values()
  ).map((c) => ({
    ...c,
    matchedProbes: Array.from(probeMatches.get(c.id) ?? [])
  }));
  const personalizedScore = (c) => {
    let s = 0;
    if (req.concern && c.concernTags.includes(req.concern)) s += 5;
    if (req.interpretedIntent?.interpretedConcern && c.concernTags.includes(req.interpretedIntent.interpretedConcern)) {
      s += 6;
    }
    if (req.topConcerns) {
      for (let i = 0; i < req.topConcerns.length; i++) {
        if (c.concernTags.includes(req.topConcerns[i])) {
          s += Math.max(1, 4 - i);
        }
      }
    }
    if (req.goals) {
      for (const g of req.goals) {
        const norm = g.toLowerCase().replace(/[_-]/g, " ");
        if (c.concernTags.some((t) => norm.includes(t.replace(/_/g, " "))) || c.safetyTags.some((t) => norm.includes(t.replace(/_/g, " ")))) {
          s += 1;
        }
      }
    }
    if (req.sensitivities) {
      for (const sens of req.sensitivities) {
        if (c.safetyTags.includes(sens)) s += 2;
      }
    }
    if (req.interpretedIntent?.avoidanceConstraints) {
      for (const av of req.interpretedIntent.avoidanceConstraints) {
        const goodTag = `${av}_free`;
        if (c.safetyTags.includes(goodTag)) {
          s += 3;
        }
      }
    }
    if (req.interpretedIntent?.interpretedProductType && c.category === req.interpretedIntent.interpretedProductType) {
      s += 4;
    }
    return s;
  };
  candidates.sort((a, b) => personalizedScore(b) - personalizedScore(a));
  return {
    query: req.query,
    source: candidates.length > 0 ? "live_backend" : "empty",
    candidates,
    failureReason: null
  };
}

// src/ai/aiLog.ts
function isDev() {
  if (typeof __DEV__ !== "undefined") return Boolean(__DEV__);
  if (typeof process !== "undefined" && process.env) {
    return process.env.NODE_ENV !== "production";
  }
  return false;
}
var consoleSink = (record) => {
  try {
    const mod = (init_aiTelemetry(), __toCommonJS(aiTelemetry_exports));
    if (mod && mod.aiTelemetry) mod.aiTelemetry.pushLog(record);
  } catch {
  }
  if (!isDev() && record.level === "info") return;
  const tag = `[ai:${record.scope}]`;
  const log = console;
  if (record.level === "error") {
    log.error(tag, record.message, record.data ?? "");
  } else if (record.level === "warn") {
    log.warn(tag, record.message, record.data ?? "");
  } else {
    log.info(tag, record.message, record.data ?? "");
  }
};
var _sink = consoleSink;
function emit(level, scope, message, data) {
  try {
    _sink({ level, scope, message, data, at: Date.now() });
  } catch {
  }
}
var aiLog = {
  info(scope, message, data) {
    emit("info", scope, message, data);
  },
  warn(scope, message, data) {
    emit("warn", scope, message, data);
  },
  error(scope, message, data) {
    emit("error", scope, message, data);
  },
  /** Override the default console sink. Call once at app boot. */
  setSink(sink) {
    _sink = sink;
  },
  /** Reset to the default console sink (mostly for tests). */
  resetSink() {
    _sink = consoleSink;
  }
};

// src/ai/validation.ts
var CONCERN_TYPES = [
  "breakouts",
  "hydration",
  "texture",
  "dark_marks",
  "redness",
  "oiliness",
  "sensitivity",
  "pores"
];
var SEVERITIES = [
  "none",
  "low",
  "mild",
  "moderate",
  "high"
];
var DIRECTIONS = ["better", "same", "worse", "new"];
var FACE_REGIONS = [
  "forehead",
  "t_zone",
  "left_cheek",
  "right_cheek",
  "nose",
  "chin",
  "jawline",
  "under_eyes",
  "across_face"
];
var PRODUCT_CATEGORIES = [
  "cleanser",
  "serum",
  "moisturizer",
  "spot_treatment",
  "toner",
  "spf",
  "mask",
  "unknown"
];
var ROUTINE_SLOTS = ["morning", "evening", "saved"];
var SCORE_BANDS = ["poor", "fair", "good", "great"];
var MATCH_BANDS = ["weak", "fair", "strong", "excellent"];
var DELTA_REFS = ["previous_scan", "baseline", "none"];
var QUALITY_ISSUES = [
  "blurry",
  "low_light",
  "angled",
  "partial_face",
  "occluded"
];
function isString(v) {
  return typeof v === "string";
}
var ZONE_SET = new Set(ZONE_IDS);
var CONCERN_SET = new Set(CONCERN_IDS);
function validateFindingV2(raw) {
  if (!isObject(raw)) return null;
  const id = isString(raw.id) && raw.id.length >= 1 ? raw.id : null;
  if (!id) return null;
  if (!isString(raw.zone) || !ZONE_SET.has(raw.zone)) return null;
  if (!isString(raw.concern) || !CONCERN_SET.has(raw.concern)) {
    return null;
  }
  const severity = typeof raw.severity === "number" && Number.isInteger(raw.severity) ? raw.severity : null;
  if (severity === null || severity < 1 || severity > 5) return null;
  if (!isString(raw.title) || raw.title.length < 2) return null;
  if (!isString(raw.observation) || raw.observation.length < 4) return null;
  if (!isString(raw.recommendation) || raw.recommendation.length < 4) {
    return null;
  }
  if (!Array.isArray(raw.ingredient_hints)) return null;
  const hints = raw.ingredient_hints.filter(
    (h) => typeof h === "string" && h.length > 0
  );
  if (hints.length === 0) return null;
  let confidence;
  if (typeof raw.confidence === "number" && Number.isFinite(raw.confidence)) {
    confidence = Math.max(0, Math.min(1, raw.confidence));
  }
  return {
    id,
    zone: raw.zone,
    concern: raw.concern,
    severity,
    title: raw.title,
    observation: raw.observation,
    recommendation: raw.recommendation,
    ingredient_hints: hints.slice(0, 3),
    ...confidence !== void 0 ? { confidence } : {}
  };
}
var OVERLAY_STYLES = /* @__PURE__ */ new Set([
  "soft_mask",
  "heatmap",
  "outline",
  "pin"
]);
function validateOverlayV2(raw) {
  if (!isObject(raw)) return null;
  if (!isString(raw.zone) || !ZONE_SET.has(raw.zone)) return null;
  if (!isString(raw.concern) || !CONCERN_SET.has(raw.concern)) {
    return null;
  }
  if (!isString(raw.style) || !OVERLAY_STYLES.has(raw.style)) {
    return null;
  }
  if (typeof raw.opacity !== "number" || !Number.isFinite(raw.opacity)) {
    return null;
  }
  const findingId = isString(raw.finding_id) && raw.finding_id.length > 0 ? raw.finding_id : null;
  if (!findingId) return null;
  return {
    zone: raw.zone,
    concern: raw.concern,
    style: raw.style,
    opacity: Math.max(0.05, Math.min(0.6, raw.opacity)),
    findingId
  };
}
function validateInsightV2(raw) {
  if (!isObject(raw)) return null;
  const id = isString(raw.id) && raw.id.length > 0 ? raw.id : null;
  if (!id) return null;
  if (!isString(raw.title) || raw.title.length < 2) return null;
  if (!isString(raw.body) || raw.body.length < 4) return null;
  const ICONS = /* @__PURE__ */ new Set([
    "barrier",
    "hydration",
    "clarity",
    "tone",
    "consistency",
    "protection",
    "gentle"
  ]);
  if (!isString(raw.icon) || !ICONS.has(raw.icon)) {
    return null;
  }
  const related = Array.isArray(raw.related_finding_ids) ? raw.related_finding_ids.filter(
    (s) => typeof s === "string" && s.length > 0
  ) : [];
  return {
    id,
    title: raw.title,
    body: raw.body,
    icon: raw.icon,
    related_finding_ids: related.slice(0, 4)
  };
}
function validateRoutineSeedV2(raw) {
  if (!isObject(raw)) return null;
  const skinNeeds = Array.isArray(raw.skin_needs) ? raw.skin_needs.filter(
    (s) => typeof s === "string" && s.length > 0
  ) : null;
  if (!skinNeeds || skinNeeds.length === 0) return null;
  const avoid = Array.isArray(raw.avoid_tonight) ? raw.avoid_tonight.filter(
    (s) => typeof s === "string" && s.length > 0
  ) : [];
  const STEPS = /* @__PURE__ */ new Set(["cleanse", "treat", "moisturize", "protect"]);
  const types = Array.isArray(raw.recommended_step_types) ? raw.recommended_step_types.filter(
    (s) => typeof s === "string" && STEPS.has(s)
  ) : null;
  if (!types || types.length === 0) return null;
  if (raw.intensity !== "gentle" && raw.intensity !== "moderate" && raw.intensity !== "active") {
    return null;
  }
  const taglinesRaw = isObject(raw.step_taglines) ? raw.step_taglines : {};
  const step_taglines = {};
  for (const k of ["cleanse", "treat", "moisturize", "protect"]) {
    const v = taglinesRaw[k];
    if (typeof v === "string" && v.length > 0) {
      step_taglines[k] = v.slice(0, 80);
    }
  }
  return {
    skin_needs: skinNeeds.slice(0, 5),
    avoid_tonight: avoid.slice(0, 5),
    recommended_step_types: types.slice(0, 4),
    intensity: raw.intensity,
    step_taglines
  };
}
function validateQualityV2(raw) {
  if (!isObject(raw)) return null;
  if (typeof raw.usable !== "boolean") return null;
  if (raw.mode !== "full" && raw.mode !== "limited") return null;
  const score = typeof raw.score === "number" && Number.isFinite(raw.score) ? Math.max(0, Math.min(1, raw.score)) : null;
  if (score === null) return null;
  const reasons = Array.isArray(raw.reasons) ? raw.reasons.filter(
    (s) => typeof s === "string" && s.length > 0
  ) : [];
  return {
    usable: raw.usable,
    mode: raw.mode,
    score,
    reasons: reasons.slice(0, 5)
  };
}
function clampScoreField(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const i = Math.round(v);
  if (i < 0 || i > 100) return null;
  return i;
}
function validateScanResultV2(v) {
  if (!isObject(v)) {
    aiLog.warn("validateScanResultV2", "not an object");
    return null;
  }
  const overall = clampScoreField(v.overall_score);
  if (overall === null) {
    aiLog.warn("validateScanResultV2", "overall_score invalid");
    return null;
  }
  if (!isObject(v.score_breakdown)) {
    aiLog.warn("validateScanResultV2", "score_breakdown not object");
    return null;
  }
  const sb = v.score_breakdown;
  const keys = [
    "hydration",
    "texture",
    "tone",
    "clarity",
    "vitality"
  ];
  const score_breakdown = {};
  for (const k of keys) {
    const n = clampScoreField(sb[k]);
    if (n === null) {
      aiLog.warn("validateScanResultV2", `score_breakdown.${k} invalid`);
      return null;
    }
    score_breakdown[k] = n;
  }
  if (!isString(v.headline) || v.headline.length < 4) {
    aiLog.warn("validateScanResultV2", "headline invalid");
    return null;
  }
  if (!isString(v.summary) || v.summary.length < 10) {
    aiLog.warn("validateScanResultV2", "summary invalid");
    return null;
  }
  if (!Array.isArray(v.findings)) {
    aiLog.warn("validateScanResultV2", "findings not array");
    return null;
  }
  const findings = [];
  for (const f of v.findings) {
    const parsed = validateFindingV2(f);
    if (parsed) findings.push(parsed);
  }
  if (findings.length < MIN_FINDINGS) {
    aiLog.warn(
      "validateScanResultV2",
      `only ${findings.length} valid findings; need >= ${MIN_FINDINGS}`
    );
    return null;
  }
  let overlays;
  if (Array.isArray(v.overlays)) {
    overlays = v.overlays.map(validateOverlayV2).filter((o) => o !== null).slice(0, 8);
  }
  let topFocus;
  if (Array.isArray(v.top_focus_priority)) {
    topFocus = v.top_focus_priority.filter((s) => typeof s === "string" && s.length > 0).slice(0, 4);
  }
  let insights;
  if (Array.isArray(v.insights)) {
    insights = v.insights.map(validateInsightV2).filter((i) => i !== null).slice(0, 4);
  }
  let routineSeed;
  if (v.routine_seed !== void 0 && v.routine_seed !== null) {
    routineSeed = validateRoutineSeedV2(v.routine_seed) ?? void 0;
  }
  let quality;
  if (v.quality !== void 0 && v.quality !== null) {
    quality = validateQualityV2(v.quality) ?? void 0;
  }
  return {
    overall_score: overall,
    // All five keys are populated above; the loop returns null if any
    // are missing, so the cast away from `Partial` is safe here.
    score_breakdown,
    headline: v.headline,
    summary: v.summary,
    findings: findings.slice(0, MAX_FINDINGS),
    ...overlays ? { overlays } : {},
    ...topFocus ? { top_focus_priority: topFocus } : {},
    ...insights ? { insights } : {},
    ...routineSeed ? { routine_seed: routineSeed } : {},
    ...quality ? { quality } : {}
  };
}
function deterministicScanResultV2(scanId) {
  return {
    overall_score: 78,
    score_breakdown: {
      hydration: 76,
      texture: 78,
      tone: 80,
      clarity: 79,
      vitality: 78
    },
    headline: "Balanced skin with everyday observations.",
    summary: "Your skin reads calm overall with the kind of small everyday signals most healthy skin shows. The notes below are gentle observations to track over time, not concerns to fix today.",
    findings: [
      {
        id: `${scanId}-baseline-texture`,
        zone: "forehead",
        concern: "texture",
        severity: 1,
        title: "Even surface texture",
        observation: "Surface texture across the forehead reads smooth and uniform.",
        recommendation: "Stay consistent with a gentle daily cleanser to keep this baseline.",
        ingredient_hints: ["niacinamide", "panthenol"]
      },
      {
        id: `${scanId}-baseline-undereye`,
        zone: "left_undereye",
        concern: "dark_circles",
        severity: 1,
        title: "Subtle under-eye softness",
        observation: "A faint shadow is visible under the eye, consistent with everyday rest patterns.",
        recommendation: "A lightweight eye cream with caffeine in the morning can help brighten this area.",
        ingredient_hints: ["caffeine", "peptides"]
      },
      {
        id: `${scanId}-baseline-tzone`,
        zone: "nose_tip",
        concern: "enlarged_pores",
        severity: 1,
        title: "Mild T-zone pore visibility",
        observation: "Pores in the T-zone are slightly more visible than the surrounding skin.",
        recommendation: "A weekly clay or BHA treatment can keep pores looking refined.",
        ingredient_hints: ["salicylic acid", "clay"],
        confidence: 0.55
      }
    ],
    overlays: [
      {
        zone: "forehead",
        concern: "texture",
        style: "soft_mask",
        opacity: 0.18,
        findingId: `${scanId}-baseline-texture`
      },
      {
        zone: "left_undereye",
        concern: "dark_circles",
        style: "soft_mask",
        opacity: 0.22,
        findingId: `${scanId}-baseline-undereye`
      },
      {
        zone: "right_undereye",
        concern: "dark_circles",
        style: "soft_mask",
        opacity: 0.22,
        findingId: `${scanId}-baseline-undereye`
      },
      {
        zone: "nose_tip",
        concern: "enlarged_pores",
        style: "soft_mask",
        opacity: 0.16,
        findingId: `${scanId}-baseline-tzone`
      }
    ],
    top_focus_priority: [
      `${scanId}-baseline-undereye`,
      `${scanId}-baseline-texture`,
      `${scanId}-baseline-tzone`
    ],
    insights: [
      {
        id: `${scanId}-insight-consistency`,
        title: "Gentle consistency",
        body: "Your skin reads steady \u2014 small daily steps will hold this baseline better than aggressive treatments.",
        icon: "consistency",
        related_finding_ids: [`${scanId}-baseline-texture`]
      },
      {
        id: `${scanId}-insight-hydration`,
        title: "Light hydration",
        body: "A lightweight humectant under your moisturizer keeps the under-eye area looking rested.",
        icon: "hydration",
        related_finding_ids: [`${scanId}-baseline-undereye`]
      },
      {
        id: `${scanId}-insight-protection`,
        title: "Daily protection",
        body: "A daily SPF protects the tone and clarity your skin already shows.",
        icon: "protection",
        related_finding_ids: []
      }
    ],
    routine_seed: {
      skin_needs: ["gentle baseline", "light hydration", "daily protection"],
      avoid_tonight: ["harsh actives"],
      recommended_step_types: ["cleanse", "moisturize", "protect"],
      intensity: "gentle",
      step_taglines: {
        cleanse: "Gentle daily reset for balanced skin.",
        treat: "Light hydration under the eyes.",
        moisturize: "Lightweight hydration that supports your barrier.",
        protect: "Daily SPF \u2014 your tone\u2019s best ally."
      }
    },
    quality: {
      usable: true,
      mode: "full",
      score: 0.82,
      reasons: []
    }
  };
}
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}
function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}
function isBool(v) {
  return typeof v === "boolean";
}
function isObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function inEnum(v, values) {
  return typeof v === "string" && values.includes(v);
}
function clampInt(n, min, max) {
  return Math.max(min, Math.min(max, Math.round(n)));
}
function pickIntOrNull(v) {
  if (v === null) return null;
  if (isFiniteNumber(v)) return Math.round(v);
  return null;
}
function arrayOfStrings(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(isString);
}
function arrayOfEnum(v, values) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => inEnum(x, values));
}
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
function validateNormalizedPoint(v) {
  if (!isObject(v)) return null;
  if (!isFiniteNumber(v.x) || !isFiniteNumber(v.y)) return null;
  return { x: clamp01(v.x), y: clamp01(v.y) };
}
function validateRegionPolygon(v) {
  if (!Array.isArray(v)) return void 0;
  const points = [];
  for (const raw of v) {
    const p = validateNormalizedPoint(raw);
    if (p) points.push(p);
  }
  if (points.length < 3) return void 0;
  return points;
}
function validateFaceOverlay(v) {
  if (!isObject(v)) return void 0;
  if (!isObject(v.face_box)) return void 0;
  const fb = v.face_box;
  if (!isFiniteNumber(fb.x) || !isFiniteNumber(fb.y) || !isFiniteNumber(fb.width) || !isFiniteNumber(fb.height)) {
    return void 0;
  }
  if (!isObject(v.landmarks)) return void 0;
  const lm = v.landmarks;
  const leftEye = validateNormalizedPoint(lm.left_eye);
  const rightEye = validateNormalizedPoint(lm.right_eye);
  const noseTip = validateNormalizedPoint(lm.nose_tip);
  const mouthCenter = validateNormalizedPoint(lm.mouth_center);
  const chin = validateNormalizedPoint(lm.chin);
  const foreheadCenter = validateNormalizedPoint(lm.forehead_center);
  if (!leftEye || !rightEye || !noseTip || !mouthCenter || !chin || !foreheadCenter) {
    return void 0;
  }
  return {
    face_box: {
      x: clamp01(fb.x),
      y: clamp01(fb.y),
      width: clamp01(fb.width),
      height: clamp01(fb.height)
    },
    landmarks: {
      left_eye: leftEye,
      right_eye: rightEye,
      nose_tip: noseTip,
      mouth_center: mouthCenter,
      chin,
      forehead_center: foreheadCenter
    }
  };
}
function validateFinding(v) {
  if (!isObject(v)) return null;
  const concern = v.concern;
  const severity = v.severity;
  const direction = v.direction_vs_previous;
  if (!inEnum(concern, CONCERN_TYPES)) return null;
  if (!inEnum(severity, SEVERITIES)) return null;
  if (!inEnum(direction, DIRECTIONS)) return null;
  const confidence = isFiniteNumber(v.confidence) ? Math.max(0, Math.min(1, v.confidence)) : 0.5;
  const regions = arrayOfEnum(v.regions, FACE_REGIONS);
  const userSummary = isString(v.user_summary) ? v.user_summary : "";
  const clinicianSummary = isString(v.clinician_style_summary) ? v.clinician_style_summary : "";
  const rawPriority = isFiniteNumber(v.marker_priority) ? clampInt(v.marker_priority, 0, 3) : 3;
  const markerPriority = rawPriority;
  const regionPolygon = validateRegionPolygon(v.region_polygon);
  return {
    concern,
    severity,
    direction_vs_previous: direction,
    confidence,
    regions,
    user_summary: userSummary,
    clinician_style_summary: clinicianSummary,
    marker_priority: markerPriority,
    ...regionPolygon ? { region_polygon: regionPolygon } : {}
  };
}
function validateScoreFactors(v) {
  if (!isObject(v)) return null;
  const keys = [
    "breakouts",
    "hydration",
    "texture",
    "dark_marks",
    "redness",
    "oiliness",
    "sensitivity",
    "pores"
  ];
  const out = {};
  for (const k of keys) {
    const raw = v[k];
    if (!isFiniteNumber(raw)) return null;
    out[k] = clampInt(raw, 0, 100);
  }
  return out;
}
function validateFaceScanAnalysis(v) {
  if (!isObject(v)) {
    aiLog.warn("validateFaceScanAnalysis", "not an object");
    return null;
  }
  if (!isNonEmptyString(v.scan_id)) {
    aiLog.warn("validateFaceScanAnalysis", "missing scan_id");
    return null;
  }
  if (!isObject(v.skin_score)) {
    aiLog.warn("validateFaceScanAnalysis", "missing skin_score");
    return null;
  }
  const ss = v.skin_score;
  if (!isFiniteNumber(ss.value)) {
    aiLog.warn("validateFaceScanAnalysis", "missing skin_score.value");
    return null;
  }
  if (!inEnum(ss.band, SCORE_BANDS)) {
    aiLog.warn("validateFaceScanAnalysis", "bad skin_score.band");
    return null;
  }
  const factors = validateScoreFactors(v.score_factors);
  if (!factors) {
    aiLog.warn("validateFaceScanAnalysis", "bad score_factors");
    return null;
  }
  if (!isObject(v.image_quality)) {
    aiLog.warn("validateFaceScanAnalysis", "missing image_quality");
    return null;
  }
  if (!isObject(v.next_focus)) {
    aiLog.warn("validateFaceScanAnalysis", "missing next_focus");
    return null;
  }
  if (!isObject(v.plan_inputs)) {
    aiLog.warn("validateFaceScanAnalysis", "missing plan_inputs");
    return null;
  }
  const findings = Array.isArray(v.findings) ? v.findings.map(validateFinding).filter((f) => !!f) : [];
  const primaryConcern = inEnum(v.primary_concern, CONCERN_TYPES) ? v.primary_concern : null;
  const secondaryConcerns = arrayOfEnum(v.secondary_concerns, CONCERN_TYPES);
  const faceOverlay = validateFaceOverlay(v.face_overlay);
  return {
    scan_id: v.scan_id,
    analyzed_at_iso: isNonEmptyString(v.analyzed_at_iso) ? v.analyzed_at_iso : (/* @__PURE__ */ new Date()).toISOString(),
    image_quality: {
      usable: isBool(v.image_quality.usable) ? v.image_quality.usable : true,
      issues: arrayOfEnum(v.image_quality.issues, QUALITY_ISSUES),
      confidence: isFiniteNumber(v.image_quality.confidence) ? Math.max(0, Math.min(1, v.image_quality.confidence)) : 0.5
    },
    skin_score: {
      value: clampInt(ss.value, 0, 100),
      band: ss.band,
      delta_vs_previous: pickIntOrNull(ss.delta_vs_previous),
      delta_vs_baseline: pickIntOrNull(ss.delta_vs_baseline),
      why_line: isString(ss.why_line) ? ss.why_line : "",
      explanation: isString(ss.explanation) ? ss.explanation : ""
    },
    primary_concern: primaryConcern,
    secondary_concerns: secondaryConcerns,
    findings,
    score_factors: factors,
    next_focus: {
      tonight: arrayOfStrings(v.next_focus.tonight),
      avoid: arrayOfStrings(v.next_focus.avoid)
    },
    plan_inputs: {
      target_concerns: arrayOfEnum(v.plan_inputs.target_concerns, CONCERN_TYPES),
      preferred_product_categories: arrayOfEnum(
        v.plan_inputs.preferred_product_categories,
        PRODUCT_CATEGORIES.filter((c) => c !== "unknown")
      ),
      contraindication_tags: arrayOfStrings(
        v.plan_inputs.contraindication_tags
      )
    },
    ...faceOverlay ? { face_overlay: faceOverlay } : {}
  };
}
function validateProductIdentity(v) {
  if (!isObject(v)) {
    aiLog.warn("validateProductIdentity", "not an object");
    return null;
  }
  if (!inEnum(v.source, ["barcode", "image", "hybrid"])) {
    aiLog.warn("validateProductIdentity", "bad source");
    return null;
  }
  if (!inEnum(v.product_category, PRODUCT_CATEGORIES)) {
    aiLog.warn("validateProductIdentity", "bad product_category");
    return null;
  }
  return {
    source: v.source,
    confidence: isFiniteNumber(v.confidence) ? Math.max(0, Math.min(1, v.confidence)) : 0.5,
    resolved: isBool(v.resolved) ? v.resolved : false,
    brand: isString(v.brand) ? v.brand : null,
    product_name: isString(v.product_name) ? v.product_name : null,
    canonical_title: isString(v.canonical_title) ? v.canonical_title : null,
    product_category: v.product_category,
    likely_concerns_supported: arrayOfEnum(
      v.likely_concerns_supported,
      CONCERN_TYPES
    ),
    key_claims: arrayOfStrings(v.key_claims),
    barcode_value: isString(v.barcode_value) ? v.barcode_value : null,
    catalog_lookup_key: isString(v.catalog_lookup_key) ? v.catalog_lookup_key : null,
    packaging_notes: isString(v.packaging_notes) ? v.packaging_notes : ""
  };
}
function validateBarcodeResolution(v) {
  if (!isObject(v)) {
    aiLog.warn("validateBarcodeResolution", "not an object");
    return null;
  }
  if (!isString(v.barcode_value)) {
    aiLog.warn("validateBarcodeResolution", "missing barcode_value");
    return null;
  }
  const identity2 = v.identity === null ? null : validateProductIdentity(v.identity);
  return {
    barcode_value: v.barcode_value,
    found: isBool(v.found) ? v.found : false,
    matched_catalog_product_id: isString(v.matched_catalog_product_id) ? v.matched_catalog_product_id : null,
    identity: identity2,
    fallback_needed: isBool(v.fallback_needed) ? v.fallback_needed : true
  };
}
var SCAN_PREFLIGHT_REASONS = [
  "ok",
  "no_face",
  "partial_face",
  "too_dark",
  "too_blurry",
  "not_centered",
  "unknown"
];
function validateScanPreflightResult(v) {
  if (!isObject(v)) {
    aiLog.warn("validateScanPreflightResult", "not an object");
    return null;
  }
  if (!inEnum(v.reason, SCAN_PREFLIGHT_REASONS)) {
    aiLog.warn("validateScanPreflightResult", "bad reason");
    return null;
  }
  let face_box = null;
  if (isObject(v.face_box)) {
    const fb = v.face_box;
    if (isFiniteNumber(fb.x) && isFiniteNumber(fb.y) && isFiniteNumber(fb.width) && isFiniteNumber(fb.height)) {
      face_box = {
        x: Math.max(0, Math.min(1, fb.x)),
        y: Math.max(0, Math.min(1, fb.y)),
        width: Math.max(0, Math.min(1, fb.width)),
        height: Math.max(0, Math.min(1, fb.height))
      };
    }
  }
  return {
    face_present: isBool(v.face_present) ? v.face_present : false,
    full_face_visible: isBool(v.full_face_visible) ? v.full_face_visible : false,
    centered_enough: isBool(v.centered_enough) ? v.centered_enough : false,
    lighting_ok: isBool(v.lighting_ok) ? v.lighting_ok : false,
    blur_ok: isBool(v.blur_ok) ? v.blur_ok : false,
    face_box,
    reason: v.reason,
    retry_message: isString(v.retry_message) ? v.retry_message : ""
  };
}
function validateProductMatch(v) {
  if (!isObject(v)) return null;
  if (!isNonEmptyString(v.product_id)) return null;
  if (!isFiniteNumber(v.match_score)) return null;
  if (!inEnum(v.match_band, MATCH_BANDS)) return null;
  if (!inEnum(v.recommended_slot, ROUTINE_SLOTS)) return null;
  return {
    product_id: v.product_id,
    match_score: clampInt(v.match_score, 0, 100),
    match_band: v.match_band,
    primary_reasons: arrayOfStrings(v.primary_reasons),
    target_concerns: arrayOfEnum(v.target_concerns, CONCERN_TYPES),
    recommended_slot: v.recommended_slot,
    natural_option: isBool(v.natural_option) ? v.natural_option : false,
    avoid_if_tags: arrayOfStrings(v.avoid_if_tags)
  };
}
function validateProductMatchResult(v) {
  if (!isObject(v)) {
    aiLog.warn("validateProductMatchResult", "not an object");
    return null;
  }
  if (!isString(v.for_user_id)) {
    aiLog.warn("validateProductMatchResult", "missing for_user_id");
    return null;
  }
  const matches = Array.isArray(v.matches) ? v.matches.map(validateProductMatch).filter((m) => !!m) : [];
  const alternatives = Array.isArray(v.alternatives) ? v.alternatives.map(validateProductMatch).filter((m) => !!m) : [];
  return {
    for_user_id: v.for_user_id,
    based_on_scan_id: isString(v.based_on_scan_id) ? v.based_on_scan_id : null,
    top_pick_product_id: isString(v.top_pick_product_id) ? v.top_pick_product_id : null,
    matches,
    alternatives
  };
}
function validateRoutineAction(v) {
  if (!isObject(v)) return null;
  if (!inEnum(v.slot, ROUTINE_SLOTS)) return null;
  return {
    slot: v.slot,
    step_order: isFiniteNumber(v.step_order) ? Math.max(1, Math.round(v.step_order)) : 1,
    title: isString(v.title) ? v.title : "",
    instruction: isString(v.instruction) ? v.instruction : "",
    linked_product_id: isString(v.linked_product_id) ? v.linked_product_id : null,
    reason: isString(v.reason) ? v.reason : ""
  };
}
function validateRoutineRecommendation(v) {
  if (!isObject(v)) {
    aiLog.warn("validateRoutineRecommendation", "not an object");
    return null;
  }
  return {
    based_on_scan_id: isString(v.based_on_scan_id) ? v.based_on_scan_id : null,
    headline: isString(v.headline) ? v.headline : "",
    tonight_focus: isString(v.tonight_focus) ? v.tonight_focus : "",
    morning: Array.isArray(v.morning) ? v.morning.map(validateRoutineAction).filter((a) => !!a) : [],
    evening: Array.isArray(v.evening) ? v.evening.map(validateRoutineAction).filter((a) => !!a) : [],
    saved_for_later: Array.isArray(v.saved_for_later) ? v.saved_for_later.map(validateRoutineAction).filter((a) => !!a) : [],
    reminder_recommended: isBool(v.reminder_recommended) ? v.reminder_recommended : false
  };
}
function validateSkinScoreExplanation(v) {
  if (!isObject(v)) {
    aiLog.warn("validateSkinScoreExplanation", "not an object");
    return null;
  }
  if (!isFiniteNumber(v.score)) {
    aiLog.warn("validateSkinScoreExplanation", "missing score");
    return null;
  }
  if (!inEnum(v.band, SCORE_BANDS)) {
    aiLog.warn("validateSkinScoreExplanation", "bad band");
    return null;
  }
  if (!inEnum(v.delta_reference, DELTA_REFS)) {
    aiLog.warn("validateSkinScoreExplanation", "bad delta_reference");
    return null;
  }
  return {
    score: clampInt(v.score, 0, 100),
    band: v.band,
    delta_reference: v.delta_reference,
    delta_value: pickIntOrNull(v.delta_value),
    short_status: isString(v.short_status) ? v.short_status : "",
    why_line: isString(v.why_line) ? v.why_line : "",
    coach_line: isString(v.coach_line) ? v.coach_line : ""
  };
}
function validateProgressExplanation(v) {
  if (!isObject(v)) {
    aiLog.warn("validateProgressExplanation", "not an object");
    return null;
  }
  return {
    strongest_improvement: isString(v.strongest_improvement) ? v.strongest_improvement : "",
    strongest_regression: isString(v.strongest_regression) ? v.strongest_regression : null,
    unchanged_summary: isString(v.unchanged_summary) ? v.unchanged_summary : "",
    short_narrative: isString(v.short_narrative) ? v.short_narrative : "",
    compare_caption: isString(v.compare_caption) ? v.compare_caption : ""
  };
}
function validateSearchSuggestionResult(v) {
  if (!isObject(v)) {
    aiLog.warn("validateSearchSuggestionResult", "not an object");
    return null;
  }
  return {
    prefill_placeholder: isString(v.prefill_placeholder) ? v.prefill_placeholder : "",
    suggestion_chips: arrayOfStrings(v.suggestion_chips),
    refinement_chips: arrayOfStrings(v.refinement_chips)
  };
}
var IMAGE_SOURCE_ENUM = ["merchant", "brand", "obf", "none"];
var AVAILABILITY_ENUM = ["available", "unknown"];
var LIVE_LOOKUP_CONFIDENCE_ENUM = ["high", "medium", "low"];
function validateLiveProductCandidate(v) {
  if (!isObject(v)) return null;
  if (!isNonEmptyString(v.id)) return null;
  if (!isNonEmptyString(v.brand)) return null;
  if (!isNonEmptyString(v.name)) return null;
  if (!inEnum(v.category, PRODUCT_CATEGORIES)) return null;
  const imageSource = inEnum(v.imageSource, IMAGE_SOURCE_ENUM) ? v.imageSource : "none";
  const availability = inEnum(v.availability, AVAILABILITY_ENUM) ? v.availability : "unknown";
  const matchScore = isFiniteNumber(v.matchScore) ? clampInt(v.matchScore, 0, 100) : 60;
  const price = v.price === null ? null : isFiniteNumber(v.price) ? Math.max(0, v.price) : null;
  return {
    id: v.id,
    brand: v.brand,
    name: v.name,
    category: v.category,
    concernTags: arrayOfEnum(v.concernTags, CONCERN_TYPES),
    skinTypeTags: arrayOfStrings(v.skinTypeTags),
    ingredientsHighlights: arrayOfStrings(v.ingredientsHighlights),
    price,
    currency: isNonEmptyString(v.currency) ? v.currency : "USD",
    merchantName: isString(v.merchantName) ? v.merchantName : null,
    productUrl: isString(v.productUrl) ? v.productUrl : null,
    imageUrl: isString(v.imageUrl) ? v.imageUrl : null,
    imageSource,
    shortDescription: isString(v.shortDescription) ? v.shortDescription : "",
    matchReason: isString(v.matchReason) ? v.matchReason : "",
    availability,
    sourceTimestamp: isNonEmptyString(v.sourceTimestamp) ? v.sourceTimestamp : (/* @__PURE__ */ new Date()).toISOString(),
    matchScore
  };
}
function validateLiveProductLookupResult(v) {
  if (!isObject(v)) {
    aiLog.warn("validateLiveProductLookupResult", "not an object");
    return null;
  }
  if (!isString(v.query)) {
    aiLog.warn("validateLiveProductLookupResult", "missing query");
    return null;
  }
  if (!inEnum(v.confidence, LIVE_LOOKUP_CONFIDENCE_ENUM)) {
    aiLog.warn("validateLiveProductLookupResult", "bad confidence");
    return null;
  }
  const candidates = Array.isArray(v.candidates) ? v.candidates.map(validateLiveProductCandidate).filter((c) => !!c) : [];
  return {
    query: v.query,
    candidates,
    confidence: v.confidence
  };
}
function validateScanToPlanBundle(v) {
  if (!isObject(v)) return null;
  const analysis = validateFaceScanAnalysis(v.analysis);
  const matches = validateProductMatchResult(v.matches);
  const routine = validateRoutineRecommendation(v.routine);
  const score = validateSkinScoreExplanation(v.score);
  if (!analysis || !matches || !routine || !score) {
    aiLog.warn("validateScanToPlanBundle", "partial bundle");
    return null;
  }
  return { analysis, matches, routine, score };
}
function validateProductRerankResult(v) {
  if (!isObject(v)) {
    aiLog.warn("validateProductRerankResult", "not an object");
    return null;
  }
  const heroIdRaw = v.heroId;
  const heroId = typeof heroIdRaw === "string" && heroIdRaw.trim().length > 0 ? heroIdRaw.trim() : null;
  const altsRaw = v.alternativeIds;
  const alternativeIds = arrayOfStrings(altsRaw).map((s) => s.trim()).filter((s) => s.length > 0);
  const whyRaw = v.whyHeroFits;
  const whyHeroFits = typeof whyRaw === "string" && whyRaw.trim().length > 0 ? whyRaw.trim().slice(0, 140) : null;
  const avoidRaw = v.whatToAvoid;
  const whatToAvoid = arrayOfStrings(avoidRaw).map((s) => s.trim().slice(0, 80)).filter((s) => s.length > 0).slice(0, 5);
  const dedupedAlts = heroId ? alternativeIds.filter((id) => id !== heroId) : alternativeIds;
  return {
    heroId,
    alternativeIds: dedupedAlts,
    whyHeroFits,
    whatToAvoid
  };
}
function validateProductRecommendationPlan(v) {
  if (!isObject(v)) {
    aiLog.warn("validateProductRecommendationPlan", "not an object");
    return null;
  }
  const modeRaw = v.recommendationMode;
  const mode = modeRaw === "best_for_you" || modeRaw === "query_driven_search" ? modeRaw : null;
  if (!mode) {
    aiLog.warn("validateProductRecommendationPlan", "invalid recommendationMode");
    return null;
  }
  const need = v.userNeedSummary;
  const userNeedSummary = typeof need === "string" && need.trim().length > 0 ? need.trim().slice(0, 220) : "";
  const domRaw = v.dominantConcern;
  const dominantConcern = typeof domRaw === "string" && domRaw.trim().length > 0 ? domRaw.trim().slice(0, 48) : null;
  const slotsRaw = v.slots;
  if (!Array.isArray(slotsRaw)) {
    aiLog.warn("validateProductRecommendationPlan", "slots not an array");
    return null;
  }
  const FAMILY_ENUM = /* @__PURE__ */ new Set([
    "moisturizer",
    "serum_texture",
    "chemical_exfoliant",
    "blemish_support",
    "spf",
    "cleanser",
    "other"
  ]);
  const slots = slotsRaw.filter((s) => isObject(s)).map((s) => ({
    slotKey: typeof s.slotKey === "string" ? s.slotKey.trim().slice(0, 48) : "",
    slotLabel: typeof s.slotLabel === "string" ? s.slotLabel.trim().slice(0, 60) : "",
    queryFamily: FAMILY_ENUM.has(s.queryFamily) ? s.queryFamily : "other",
    targetNeed: typeof s.targetNeed === "string" ? s.targetNeed.trim().slice(0, 140) : "",
    mustHaveSignals: arrayOfStrings(s.mustHaveSignals).map((x) => x.trim().slice(0, 48)).filter((x) => x.length > 0).slice(0, 6),
    avoidSignals: arrayOfStrings(s.avoidSignals).map((x) => x.trim().slice(0, 48)).filter((x) => x.length > 0).slice(0, 6),
    searchQueries: arrayOfStrings(s.searchQueries).map((x) => x.trim().slice(0, 80)).filter((x) => x.length > 0).slice(0, 5),
    whyThisSlotMatters: typeof s.whyThisSlotMatters === "string" ? s.whyThisSlotMatters.trim().slice(0, 220) : ""
  })).filter((s) => s.slotKey.length > 0 && s.searchQueries.length > 0).slice(0, 4);
  if (slots.length === 0) {
    aiLog.warn("validateProductRecommendationPlan", "no usable slots");
    return null;
  }
  return {
    recommendationMode: mode,
    userNeedSummary,
    dominantConcern,
    slots
  };
}
function validateSlotSelectionResult(v) {
  if (!isObject(v)) {
    aiLog.warn("validateSlotSelectionResult", "not an object");
    return null;
  }
  const selectionsRaw = v.selections;
  if (!Array.isArray(selectionsRaw)) {
    aiLog.warn("validateSlotSelectionResult", "selections not an array");
    return null;
  }
  const selections = selectionsRaw.filter((s) => isObject(s)).map((s) => ({
    slotKey: typeof s.slotKey === "string" ? s.slotKey.trim().slice(0, 48) : "",
    selectedCandidateId: typeof s.selectedCandidateId === "string" && s.selectedCandidateId.trim().length > 0 ? s.selectedCandidateId.trim() : null,
    whyPicked: typeof s.whyPicked === "string" ? s.whyPicked.trim().slice(0, 220) : "",
    whyNotOthersShort: typeof s.whyNotOthersShort === "string" ? s.whyNotOthersShort.trim().slice(0, 160) : ""
  })).filter((s) => s.slotKey.length > 0);
  if (selections.length === 0) {
    aiLog.warn("validateSlotSelectionResult", "no usable selections");
    return null;
  }
  const listReasonRaw = v.listReason;
  const listReason = typeof listReasonRaw === "string" ? listReasonRaw.trim().slice(0, 220) : "";
  return { selections, listReason };
}
function validateSearchIntentPlan(v) {
  if (!isObject(v)) {
    aiLog.warn("validateSearchIntentPlan", "not an object");
    return null;
  }
  const modeRaw = v.recommendationMode;
  if (modeRaw !== "typed_search") {
    aiLog.warn("validateSearchIntentPlan", "recommendationMode must be typed_search");
    return null;
  }
  const FAMILY_ENUM = /* @__PURE__ */ new Set([
    "moisturizer",
    "serum_texture",
    "chemical_exfoliant",
    "blemish_support",
    "spf",
    "cleanser",
    "other"
  ]);
  const famRaw = v.dominantProductFamily;
  const dominantProductFamily = FAMILY_ENUM.has(famRaw) ? famRaw : "other";
  const rawQuery = typeof v.rawQuery === "string" ? v.rawQuery.slice(0, 200) : "";
  const normalizedQuery = typeof v.normalizedQuery === "string" ? v.normalizedQuery.slice(0, 200) : rawQuery;
  const searchIntentLabel = typeof v.searchIntentLabel === "string" ? v.searchIntentLabel.slice(0, 120) : "";
  const userNeedSummary = typeof v.userNeedSummary === "string" ? v.userNeedSummary.slice(0, 220) : "";
  const sQueries = arrayOfStrings(
    v.searchQueries
  ).map((x) => x.trim().slice(0, 80)).filter((x) => x.length > 0).slice(0, 6);
  if (sQueries.length === 0) {
    aiLog.warn("validateSearchIntentPlan", "searchQueries empty");
    return null;
  }
  const mustHaveSignals = arrayOfStrings(
    v.mustHaveSignals
  ).map((x) => x.trim().slice(0, 48)).filter((x) => x.length > 0).slice(0, 6);
  const avoidSignals = arrayOfStrings(
    v.avoidSignals
  ).map((x) => x.trim().slice(0, 48)).filter((x) => x.length > 0).slice(0, 6);
  const preferredTextures = arrayOfStrings(
    v.preferredTextures
  ).map((x) => x.trim().slice(0, 48)).filter((x) => x.length > 0).slice(0, 6);
  const rankingPriorities = arrayOfStrings(
    v.rankingPriorities
  ).map((x) => x.trim().slice(0, 80)).filter((x) => x.length > 0).slice(0, 6);
  return {
    recommendationMode: "typed_search",
    rawQuery,
    normalizedQuery,
    searchIntentLabel,
    dominantProductFamily,
    userNeedSummary,
    mustHaveSignals,
    avoidSignals,
    preferredTextures,
    searchQueries: sQueries,
    rankingPriorities
  };
}
function validateProgressBundle(v) {
  if (!isObject(v)) return null;
  const progress = validateProgressExplanation(v.progress);
  const score = validateSkinScoreExplanation(v.score);
  if (!progress || !score) return null;
  return { progress, score };
}
function validateScannedProductFit(v) {
  if (!isObject(v)) return null;
  const identity2 = validateProductIdentity(v.identity);
  const fit = validateProductMatchResult(v.fit);
  if (!identity2 || !fit) return null;
  return { identity: identity2, fit };
}
function validateAssistantContext(v) {
  if (!isObject(v)) return null;
  if (!isObject(v.user_profile)) return null;
  if (!isObject(v.routine_snapshot)) return null;
  const skinTypeEnum = [
    "dry",
    "oily",
    "combination",
    "sensitive",
    "normal",
    "unknown"
  ];
  const skinType = inEnum(v.user_profile.skin_type, skinTypeEnum) ? v.user_profile.skin_type : "unknown";
  const rawDisplayName = v.user_profile.display_name;
  const displayName = typeof rawDisplayName === "string" && rawDisplayName.trim().length > 0 ? rawDisplayName.trim() : null;
  return {
    user_profile: {
      display_name: displayName,
      skin_type: skinType,
      top_goals: arrayOfStrings(v.user_profile.top_goals),
      sensitivities: arrayOfStrings(v.user_profile.sensitivities)
    },
    latest_scan: v.latest_scan === null ? null : validateFaceScanAnalysis(v.latest_scan),
    latest_score: v.latest_score === null ? null : validateSkinScoreExplanation(v.latest_score),
    routine_snapshot: {
      morning_product_ids: arrayOfStrings(
        v.routine_snapshot.morning_product_ids
      ),
      evening_product_ids: arrayOfStrings(
        v.routine_snapshot.evening_product_ids
      ),
      saved_product_ids: arrayOfStrings(
        v.routine_snapshot.saved_product_ids
      )
    },
    progress_snapshot: v.progress_snapshot === null ? null : validateProgressExplanation(v.progress_snapshot),
    top_matches: Array.isArray(v.top_matches) ? v.top_matches.map(validateProductMatch).filter((m) => !!m) : [],
    active_product_identity: v.active_product_identity === null ? null : validateProductIdentity(v.active_product_identity)
  };
}

// src/lib/commerceEnrichment.ts
var TRUSTED_HOSTS = /* @__PURE__ */ new Set([
  // Major retailers
  "sephora.com",
  "ulta.com",
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "boots.com",
  "cultbeauty.com",
  "cultbeauty.co.uk",
  "lookfantastic.com",
  "lookfantastic.co.uk",
  "spacenk.com",
  "beautypie.com",
  "dermstore.com",
  "target.com",
  "walmart.com",
  "mecca.com",
  "mecca.com.au",
  "adore.com.au",
  "feelunique.com",
  // Brand DTC domains — keep this list in sync with BRAND_DTC below.
  "cerave.com",
  "cerave.co.uk",
  "laroche-posay.us",
  "laroche-posay.co.uk",
  "theordinary.com",
  "paulaschoice.com",
  "paulaschoice.co.uk",
  "beautyofjoseon.com",
  "cosrx.com",
  "kiehls.com",
  "supergoop.com",
  "naturium.com",
  "glowrecipe.com",
  "youthtothepeople.com",
  "goodmolecules.com",
  "biotherm.com",
  "biotherm-usa.com",
  "elfcosmetics.com",
  "innisfree.com",
  "laneige.com",
  "drunkelephant.com",
  "tatcha.com",
  "fentyskin.com",
  "rare-beauty.com",
  "ren-skincare.com",
  "kinship.com",
  "iliabeauty.com",
  "farmacybeauty.com",
  "firstaidbeauty.com",
  "kosas.com",
  "merit-beauty.com",
  "summerfridays.com",
  "biossance.com",
  "krave-beauty.com",
  "anuaglobal.com",
  "anua-global.com",
  "bonajour.com",
  "illiyoon.com",
  "itsskin.com",
  "theinkeylist.com"
]);
var BRAND_DTC2 = {
  "the ordinary": { host: "theordinary.com", merchant: "The Ordinary" },
  "the inkey list": {
    host: "theinkeylist.com",
    merchant: "The Inkey List"
  },
  "inkey list": { host: "theinkeylist.com", merchant: "The Inkey List" },
  cerave: { host: "cerave.com", merchant: "CeraVe" },
  "la roche-posay": { host: "laroche-posay.us", merchant: "La Roche-Posay" },
  "la roche posay": { host: "laroche-posay.us", merchant: "La Roche-Posay" },
  "paula's choice": { host: "paulaschoice.com", merchant: "Paula's Choice" },
  "paulas choice": { host: "paulaschoice.com", merchant: "Paula's Choice" },
  "paula choice": { host: "paulaschoice.com", merchant: "Paula's Choice" },
  cosrx: { host: "cosrx.com", merchant: "COSRX" },
  "beauty of joseon": {
    host: "beautyofjoseon.com",
    merchant: "Beauty of Joseon"
  },
  "kiehl's": { host: "kiehls.com", merchant: "Kiehl's" },
  kiehls: { host: "kiehls.com", merchant: "Kiehl's" },
  supergoop: { host: "supergoop.com", merchant: "Supergoop!" },
  "supergoop!": { host: "supergoop.com", merchant: "Supergoop!" },
  naturium: { host: "naturium.com", merchant: "Naturium" },
  "glow recipe": { host: "glowrecipe.com", merchant: "Glow Recipe" },
  "youth to the people": {
    host: "youthtothepeople.com",
    merchant: "Youth To The People"
  },
  "good molecules": {
    host: "goodmolecules.com",
    merchant: "Good Molecules"
  },
  biossance: { host: "biossance.com", merchant: "Biossance" },
  "drunk elephant": {
    host: "drunkelephant.com",
    merchant: "Drunk Elephant"
  },
  tatcha: { host: "tatcha.com", merchant: "Tatcha" },
  farmacy: { host: "farmacybeauty.com", merchant: "Farmacy" },
  "first aid beauty": {
    host: "firstaidbeauty.com",
    merchant: "First Aid Beauty"
  },
  kosas: { host: "kosas.com", merchant: "Kosas" },
  merit: { host: "merit-beauty.com", merchant: "Merit" },
  "summer fridays": {
    host: "summerfridays.com",
    merchant: "Summer Fridays"
  },
  "krave beauty": { host: "krave-beauty.com", merchant: "Krave Beauty" },
  anua: { host: "anuaglobal.com", merchant: "Anua" },
  "fenty skin": { host: "fentyskin.com", merchant: "Fenty Skin" },
  ilia: { host: "iliabeauty.com", merchant: "Ilia" },
  "rare beauty": { host: "rare-beauty.com", merchant: "Rare Beauty" },
  ren: { host: "ren-skincare.com", merchant: "REN" },
  "e.l.f.": { host: "elfcosmetics.com", merchant: "e.l.f." },
  elf: { host: "elfcosmetics.com", merchant: "e.l.f." },
  innisfree: { host: "innisfree.com", merchant: "innisfree" },
  laneige: { host: "laneige.com", merchant: "LANEIGE" }
};
function hostOf(url) {
  try {
    const u = new URL(url);
    let host = u.host.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    return null;
  }
}
function isTrustedUrl(url) {
  const host = hostOf(url);
  if (!host) return false;
  if (TRUSTED_HOSTS.has(host)) return true;
  for (const t of TRUSTED_HOSTS) {
    if (host.endsWith("." + t)) return true;
  }
  return false;
}
function merchantNameForHost(host) {
  if (host.endsWith("sephora.com")) return "Sephora";
  if (host.endsWith("ulta.com")) return "Ulta";
  if (host.startsWith("amazon.")) return "Amazon";
  if (host.endsWith("boots.com")) return "Boots";
  if (host.endsWith("cultbeauty.com") || host.endsWith("cultbeauty.co.uk"))
    return "Cult Beauty";
  if (host.endsWith("lookfantastic.com") || host.endsWith("lookfantastic.co.uk"))
    return "LookFantastic";
  if (host.endsWith("spacenk.com")) return "Space NK";
  if (host.endsWith("dermstore.com")) return "Dermstore";
  if (host.endsWith("target.com")) return "Target";
  if (host.endsWith("walmart.com")) return "Walmart";
  if (host.endsWith("mecca.com.au") || host.endsWith("mecca.com"))
    return "Mecca";
  if (host.endsWith("feelunique.com")) return "Feelunique";
  const seg = host.split(".")[0] ?? host;
  return seg.replace(/-/g, " ").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
function sephoraSearchUrl(brand, name) {
  const q = encodeURIComponent(`${brand} ${name}`);
  return `https://www.sephora.com/search?keyword=${q}`;
}
function sanitizeCandidate(c) {
  let productUrl = c.productUrl;
  let merchantName = c.merchantName;
  let imageUrl = c.imageUrl;
  let imageSource = c.imageSource;
  if (productUrl && !isTrustedUrl(productUrl)) {
    productUrl = null;
    if (imageSource === "merchant" || imageSource === "brand") {
      merchantName = merchantName ?? null;
    }
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    imageUrl = null;
    imageSource = "none";
  }
  return {
    ...c,
    productUrl,
    merchantName,
    imageUrl,
    imageSource
  };
}
function enrichCommerce(c) {
  let productUrl = c.productUrl;
  let merchantName = c.merchantName;
  let imageSource = c.imageSource;
  if (productUrl) {
    const host = hostOf(productUrl);
    if (host && (!merchantName || merchantName.length === 0)) {
      merchantName = merchantNameForHost(host);
    }
    return { ...c, productUrl, merchantName, imageSource };
  }
  const brandKey = (c.brand ?? "").trim().toLowerCase();
  const dtc = BRAND_DTC2[brandKey];
  if (dtc) {
    productUrl = `https://www.${dtc.host}/`;
    merchantName = `${dtc.merchant} (DTC)`;
    imageSource = "none";
    return { ...c, productUrl, merchantName, imageSource };
  }
  if (c.brand && c.name) {
    productUrl = sephoraSearchUrl(c.brand, c.name);
    merchantName = "Sephora (search)";
    imageSource = "none";
  }
  return { ...c, productUrl, merchantName, imageSource };
}
function sanitizeAndEnrich(candidates) {
  return candidates.map(sanitizeCandidate).map(enrichCommerce);
}

// server/lib/barcodeLookup.ts
var localCatalog = {
  "gentle-foam-cleanser": {
    brand: "Acme",
    product_name: "Gentle Foam Cleanser",
    category: "cleanser",
    key_claims: ["glycerin", "panthenol", "fragrance-free"],
    packaging_notes: "White soft-touch tube, 150ml, sky-blue cap. EN/FR labelling."
  },
  "salicylic-spot-treatment": {
    brand: "Acme",
    product_name: "Spot Treatment 2%",
    category: "spot_treatment",
    key_claims: ["salicylic acid 2%"],
    packaging_notes: "Tinted glass bottle with dropper, 30ml, amber colour. EN labelling only."
  },
  "hydra-niacinamide-serum": {
    brand: "Acme",
    product_name: "Hydra Niacinamide Serum",
    category: "serum",
    key_claims: ["niacinamide 5%", "hyaluronic acid"],
    packaging_notes: "Frosted glass bottle with pipette, 30ml, white outer carton."
  }
};
var OBF_TIMEOUT_MS2 = 4e3;
var OBF_CATEGORY_MAP = [
  [/cleanser|wash|foam|micellar|gel-douche|gel douche/i, "cleanser"],
  [/serum|essence|ampoule|booster/i, "serum"],
  [/moisturi[sz]er|cream|lotion|emulsion/i, "moisturizer"],
  [/sun ?(screen|cream)|spf|sunblock/i, "spf"],
  [/toner|tonique|astringent/i, "toner"],
  [/spot ?treatment|acne|blemish/i, "spot_treatment"],
  [/mask|masque|sheet ?mask/i, "mask"]
];
function inferCategoryFromObf(productName, categoriesTags) {
  const haystack = [
    productName ?? "",
    ...categoriesTags ?? []
  ].join(" ").toLowerCase();
  for (const [re, cat] of OBF_CATEGORY_MAP) {
    if (re.test(haystack)) return cat;
  }
  return "unknown";
}
async function tryOpenBeautyFacts(barcodeValue) {
  if (!/^\d{6,14}$/.test(barcodeValue)) return null;
  const url = `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcodeValue)}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OBF_TIMEOUT_MS2);
  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        // OBF asks for a User-Agent identifying the calling app so
        // they can spot abuse. This is good hygiene + helps if we
        // ever need to ask them for higher rate limits.
        "User-Agent": "pura-ai/0.1 (https://github.com/pura-ai)",
        Accept: "application/json"
      },
      signal: controller.signal
    });
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);
  if (!res.ok) return null;
  let body;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (body.status !== 1 || !body.product) return null;
  const p = body.product;
  const brand = p.brands && p.brands.length > 0 ? p.brands.split(",")[0].trim() : null;
  const productName = p.product_name && p.product_name.length > 0 ? p.product_name : p.generic_name && p.generic_name.length > 0 ? p.generic_name : null;
  const category = inferCategoryFromObf(
    productName ?? void 0,
    p.categories_tags
  );
  const labelClaims = typeof p.labels === "string" ? p.labels.split(",").map((s) => s.trim()).filter((s) => s.length > 0).slice(0, 5) : [];
  const ingredientClaims = (p.ingredients_tags ?? []).slice(0, 5).map((t) => t.replace(/^en:/, "").replace(/-/g, " "));
  const keyClaims = labelClaims.length > 0 ? labelClaims : ingredientClaims;
  const packagingNotes = [
    p.quantity ? p.quantity : null,
    p.packaging ? p.packaging : null
  ].filter((s) => !!s && s.length > 0).join(" \xB7 ");
  return {
    matched_catalog_product_id: p.code ?? barcodeValue,
    brand,
    product_name: productName,
    canonical_title: brand && productName ? `${brand} ${productName}` : productName,
    product_category: category,
    likely_concerns_supported: [],
    key_claims: keyClaims,
    barcode_value: barcodeValue,
    catalog_lookup_key: p.code ?? null,
    packaging_notes: packagingNotes.length > 0 ? packagingNotes : ""
  };
}
function localFallback(barcodeValue) {
  const entry = localCatalog[barcodeValue];
  if (!entry) return null;
  return {
    matched_catalog_product_id: barcodeValue,
    brand: entry.brand,
    product_name: entry.product_name,
    canonical_title: `${entry.brand} ${entry.product_name}`,
    product_category: entry.category,
    likely_concerns_supported: [],
    key_claims: entry.key_claims,
    barcode_value: barcodeValue,
    catalog_lookup_key: barcodeValue,
    packaging_notes: entry.packaging_notes
  };
}
async function lookupBarcodeServerSide(barcodeValue) {
  const obf = await tryOpenBeautyFacts(barcodeValue);
  if (obf !== null) return obf;
  return localFallback(barcodeValue);
}

// server/lib/handlers.ts
var HandlerError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HandlerError";
  }
  status;
};
function bad(field, detail = "missing or wrong type") {
  throw new HandlerError(400, `bad request: ${field} (${detail})`);
}
function aiBad(method) {
  throw new HandlerError(
    502,
    `${method}: AI returned a payload that failed structural validation`
  );
}
function aiErrorStatus(reason) {
  switch (reason) {
    case "empty_content":
    case "length_cap":
      return 503;
    case "parse_failed":
      return 502;
    default:
      return 502;
  }
}
async function withAIErrorTranslation(method, fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AIError) {
      throw new HandlerError(
        aiErrorStatus(e.reason),
        `${method}: ${e.reason}`
      );
    }
    throw e;
  }
}
function reqString(body, key) {
  const v = body[key];
  if (typeof v !== "string" || v.length === 0) bad(key);
  return v;
}
function optString(body, key) {
  const v = body[key];
  if (v === void 0 || v === null) return void 0;
  if (typeof v !== "string") bad(key, "expected string");
  return v;
}
function reqMediaType(body, key) {
  const v = body[key];
  if (v !== "image/jpeg" && v !== "image/png") {
    bad(key, "expected image/jpeg or image/png");
  }
  return v;
}
function reqBasedOnScanId(body) {
  const v = body["basedOnScanId"];
  if (v === null) return null;
  if (typeof v !== "string") bad("basedOnScanId", "expected string|null");
  return v;
}
function repairFaceScanAnalysis(result, scanId) {
  if (!result || typeof result !== "object") return result;
  const r = result;
  if (typeof r.scan_id !== "string" || r.scan_id.length === 0) {
    r.scan_id = scanId;
  }
  if (typeof r.analyzed_at_iso !== "string" || r.analyzed_at_iso.length === 0) {
    r.analyzed_at_iso = (/* @__PURE__ */ new Date()).toISOString();
  }
  return r;
}
function repairSkinScoreExplanation(result, score, deltaReference, deltaValue) {
  if (!result || typeof result !== "object") return result;
  const r = result;
  if (typeof r.score !== "number" || !Number.isFinite(r.score)) {
    r.score = score;
  }
  if (r.delta_reference !== "previous_scan" && r.delta_reference !== "baseline" && r.delta_reference !== "none") {
    r.delta_reference = deltaReference;
  }
  if (r.delta_value !== null && !(typeof r.delta_value === "number" && Number.isFinite(r.delta_value))) {
    r.delta_value = deltaValue;
  }
  if (r.band !== "poor" && r.band !== "fair" && r.band !== "good" && r.band !== "great") {
    r.band = score >= 85 ? "great" : score >= 70 ? "good" : score >= 55 ? "fair" : "poor";
  }
  return r;
}
var HANDLERS = {
  // v19.25 — backend-owned live product search. Non-AI path.
  // Hits Open Beauty Facts server-side and returns the canonical
  // SearchProductsResponse. The first arg (OpenAI client) is
  // ignored by this handler; we route through HANDLERS so the
  // request hits the same proxy/middleware infrastructure as
  // every other method without inventing a parallel router.
  searchProducts: searchProductsHandler,
  async validateScanPreflight(client, body) {
    const params = {
      imageBase64: reqString(body, "imageBase64"),
      mediaType: reqMediaType(body, "mediaType")
    };
    const result = await withAIErrorTranslation(
      "validateScanPreflight",
      () => client.validateScanPreflight(params)
    );
    const validated = validateScanPreflightResult(result);
    if (!validated) aiBad("validateScanPreflight");
    return validated;
  },
  async analyzeFaceScan(client, body) {
    const params = {
      imageBase64: reqString(body, "imageBase64"),
      mediaType: reqMediaType(body, "mediaType"),
      scanId: reqString(body, "scanId"),
      previousSummary: optString(body, "previousSummary"),
      userProfileSummary: reqString(body, "userProfileSummary")
    };
    const result = await client.analyzeFaceScan(params);
    const repaired = repairFaceScanAnalysis(result, params.scanId);
    const validated = validateFaceScanAnalysis(repaired);
    if (!validated) aiBad("analyzeFaceScan");
    return validated;
  },
  /**
   * v32 — analyzeFaceScanV2 — strict 3-to-6 findings.
   *
   * Pipeline:
   *   1. Call OpenAI with the V2 prompt + schema (the schema itself
   *      enforces minItems: 3).
   *   2. Validate the result via `validateScanResultV2` (rejects empty,
   *      out-of-enum, missing fields).
   *   3. If validation fails, retry ONCE with a stricter system prompt
   *      addendum.
   *   4. If retry still fails, return a deterministic minimum-viable
   *      result. The client UI never branches on "nothing stood out"
   *      because the API contract always carries at least 3 findings.
   */
  async analyzeFaceScanV2(client, body) {
    const params = {
      imageBase64: reqString(body, "imageBase64"),
      mediaType: reqMediaType(body, "mediaType"),
      scanId: reqString(body, "scanId")
    };
    try {
      const first = await client.analyzeFaceScanV2({
        ...params,
        stricterReminder: false
      });
      const validatedFirst = validateScanResultV2(first);
      if (validatedFirst) return validatedFirst;
      aiLog.warn(
        "analyzeFaceScanV2",
        "first attempt failed validation, retrying with stricter prompt",
        { scanId: params.scanId }
      );
    } catch (err) {
      aiLog.warn("analyzeFaceScanV2", "first attempt threw, retrying", {
        scanId: params.scanId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
    try {
      const second = await client.analyzeFaceScanV2({
        ...params,
        stricterReminder: true
      });
      const validatedSecond = validateScanResultV2(second);
      if (validatedSecond) return validatedSecond;
      aiLog.warn(
        "analyzeFaceScanV2",
        "retry also failed validation, returning deterministic fallback",
        { scanId: params.scanId }
      );
    } catch (err) {
      aiLog.warn(
        "analyzeFaceScanV2",
        "retry threw, returning deterministic fallback",
        {
          scanId: params.scanId,
          error: err instanceof Error ? err.message : String(err)
        }
      );
    }
    return deterministicScanResultV2(params.scanId);
  },
  async identifyProductFromImage(client, body) {
    const params = {
      imageBase64: reqString(body, "imageBase64"),
      mediaType: reqMediaType(body, "mediaType")
    };
    const result = await client.identifyProductFromImage(params);
    const validated = validateProductIdentity(result);
    if (!validated) aiBad("identifyProductFromImage");
    return validated;
  },
  async normalizeBarcodeResolution(client, body) {
    const params = {
      barcodeValue: reqString(body, "barcodeValue"),
      lookupBarcode: lookupBarcodeServerSide
    };
    const result = await client.normalizeBarcodeResolution(params);
    const validated = validateBarcodeResolution(result);
    if (!validated) aiBad("normalizeBarcodeResolution");
    return validated;
  },
  async matchProductsForUser(client, body) {
    const params = {
      userId: reqString(body, "userId"),
      basedOnScanId: reqBasedOnScanId(body),
      skinStateSummary: reqString(body, "skinStateSummary"),
      candidateProductsJson: reqString(body, "candidateProductsJson")
    };
    try {
      const parsed = JSON.parse(params.candidateProductsJson);
      if (Array.isArray(parsed) && parsed.length === 0) {
        return {
          for_user_id: params.userId,
          based_on_scan_id: params.basedOnScanId,
          top_pick_product_id: null,
          matches: [],
          alternatives: []
        };
      }
    } catch {
      bad("candidateProductsJson", "must be valid JSON");
    }
    const result = await withAIErrorTranslation(
      "matchProductsForUser",
      () => client.matchProductsForUser(params)
    );
    const validated = validateProductMatchResult(result);
    if (!validated) aiBad("matchProductsForUser");
    return validated;
  },
  async generateRoutineRecommendation(client, body) {
    const params = {
      scanSummary: reqString(body, "scanSummary"),
      matchedProductsJson: reqString(body, "matchedProductsJson"),
      existingRoutineJson: reqString(body, "existingRoutineJson"),
      basedOnScanId: reqBasedOnScanId(body)
    };
    const result = await withAIErrorTranslation(
      "generateRoutineRecommendation",
      () => client.generateRoutineRecommendation(params)
    );
    const validated = validateRoutineRecommendation(result);
    if (!validated) aiBad("generateRoutineRecommendation");
    return validated;
  },
  async explainSkinScore(client, body) {
    const score = body["score"];
    if (typeof score !== "number" || !Number.isFinite(score)) {
      bad("score", "expected number");
    }
    const deltaReference = body["deltaReference"];
    if (deltaReference !== "previous_scan" && deltaReference !== "baseline" && deltaReference !== "none") {
      bad("deltaReference");
    }
    const deltaValueRaw = body["deltaValue"];
    const deltaValue = deltaValueRaw === null ? null : typeof deltaValueRaw === "number" && Number.isFinite(deltaValueRaw) ? deltaValueRaw : bad("deltaValue", "expected number|null");
    const params = {
      score,
      deltaReference,
      deltaValue,
      concernMovementsJson: reqString(body, "concernMovementsJson")
    };
    const result = await client.explainSkinScore(params);
    const repaired = repairSkinScoreExplanation(
      result,
      params.score,
      params.deltaReference,
      params.deltaValue
    );
    const validated = validateSkinScoreExplanation(repaired);
    if (!validated) aiBad("explainSkinScore");
    return validated;
  },
  async explainProgress(client, body) {
    const params = {
      baselineSummary: reqString(body, "baselineSummary"),
      latestSummary: reqString(body, "latestSummary"),
      concernMovementsJson: reqString(body, "concernMovementsJson")
    };
    const result = await client.explainProgress(params);
    const validated = validateProgressExplanation(result);
    if (!validated) aiBad("explainProgress");
    return validated;
  },
  async buildSearchSuggestions(client, body) {
    const pageContext = body["pageContext"];
    if (pageContext !== "products" && pageContext !== "assistant") {
      bad("pageContext");
    }
    const latestRaw = body["latestScanSummary"];
    const latestScanSummary = latestRaw === null ? null : typeof latestRaw === "string" ? latestRaw : bad("latestScanSummary", "expected string|null");
    const params = {
      latestScanSummary,
      routineSummary: reqString(body, "routineSummary"),
      pageContext
    };
    const result = await client.buildSearchSuggestions(params);
    const validated = validateSearchSuggestionResult(result);
    if (!validated) aiBad("buildSearchSuggestions");
    return validated;
  },
  async answerAssistant(client, body) {
    const ctx = validateAssistantContext(body["context"]);
    if (!ctx) bad("context");
    const userQuestion = reqString(body, "userQuestion");
    const result = await withAIErrorTranslation(
      "answerAssistant",
      () => client.answerAssistant({
        context: ctx,
        userQuestion
      })
    );
    if (typeof result !== "string" || result.trim().length === 0) {
      aiBad("answerAssistant");
    }
    return result;
  },
  async lookupLiveProducts(client, body) {
    const query = reqString(body, "query");
    const countRaw = body["count"];
    const count = typeof countRaw === "number" && Number.isFinite(countRaw) ? Math.max(1, Math.min(8, Math.round(countRaw))) : 4;
    let scanContext;
    const ctxRaw = body["scanContext"];
    if (ctxRaw && typeof ctxRaw === "object" && !Array.isArray(ctxRaw)) {
      const ctx = ctxRaw;
      scanContext = {
        primary_concern: typeof ctx["primary_concern"] === "string" ? ctx["primary_concern"] : null,
        secondary_concerns: Array.isArray(ctx["secondary_concerns"]) ? ctx["secondary_concerns"].filter(
          (x) => typeof x === "string"
        ) : [],
        severity_band: typeof ctx["severity_band"] === "string" ? ctx["severity_band"] : "unknown",
        regions: Array.isArray(ctx["regions"]) ? ctx["regions"].filter(
          (x) => typeof x === "string"
        ) : [],
        skin_type: typeof ctx["skin_type"] === "string" ? ctx["skin_type"] : "unknown",
        sensitivities: Array.isArray(ctx["sensitivities"]) ? ctx["sensitivities"].filter(
          (x) => typeof x === "string"
        ) : []
      };
    }
    const raw = await withAIErrorTranslation(
      "lookupLiveProducts",
      () => client.lookupLiveProducts({ query, scanContext, count })
    );
    const stamped = {
      ...raw,
      candidates: (raw.candidates ?? []).map((c) => ({
        ...c,
        sourceTimestamp: typeof c.sourceTimestamp === "string" && c.sourceTimestamp.length > 0 ? c.sourceTimestamp : (/* @__PURE__ */ new Date()).toISOString()
      }))
    };
    const validated = validateLiveProductLookupResult(stamped);
    if (!validated) aiBad("lookupLiveProducts");
    const beforeNullUrls = validated.candidates.filter(
      (c) => !c.productUrl
    ).length;
    const beforeNullMerchants = validated.candidates.filter(
      (c) => !c.merchantName
    ).length;
    const enriched = sanitizeAndEnrich(validated.candidates);
    const afterNullUrls = enriched.filter((c) => !c.productUrl).length;
    const afterNullMerchants = enriched.filter(
      (c) => !c.merchantName
    ).length;
    console.log(
      "[v18.7 enrichment]",
      JSON.stringify({
        method: "lookupLiveProducts",
        n: validated.candidates.length,
        productUrl_null_before: beforeNullUrls,
        productUrl_null_after: afterNullUrls,
        merchantName_null_before: beforeNullMerchants,
        merchantName_null_after: afterNullMerchants,
        first_candidate_after: enriched[0] ? {
          brand: enriched[0].brand,
          merchantName: enriched[0].merchantName,
          productUrl: enriched[0].productUrl
        } : null
      })
    );
    return {
      ...validated,
      candidates: enriched
    };
  },
  // v19.18 — AI rerank Step F. Tiny structured call: takes the
  // top deterministic candidates + canonical user context and
  // returns { heroId, alternativeIds, whyHeroFits }.
  async rerankProducts(client, body) {
    const candidatesRaw = body["candidates"];
    if (!Array.isArray(candidatesRaw) || candidatesRaw.length === 0) {
      bad("candidates", "expected non-empty array");
    }
    const candidates = candidatesRaw.filter((c) => !!c && typeof c === "object").map((c) => ({
      id: typeof c.id === "string" ? c.id : "",
      brand: typeof c.brand === "string" ? c.brand : "",
      name: typeof c.name === "string" ? c.name : "",
      category: typeof c.category === "string" ? c.category : null,
      concernTags: Array.isArray(c.concernTags) ? c.concernTags.filter(
        (x) => typeof x === "string"
      ) : [],
      ingredientsHighlights: Array.isArray(c.ingredientsHighlights) ? c.ingredientsHighlights.filter(
        (x) => typeof x === "string"
      ) : [],
      shortDescription: typeof c.shortDescription === "string" ? c.shortDescription : "",
      price: typeof c.price === "number" && Number.isFinite(c.price) ? c.price : null,
      localScore: typeof c.localScore === "number" && Number.isFinite(c.localScore) ? c.localScore : 60
    })).filter((c) => c.id.length > 0 && c.brand.length > 0 && c.name.length > 0);
    if (candidates.length === 0) {
      bad("candidates", "no valid candidate after coerce");
    }
    const profileRaw = body["profile"] ?? {};
    const profile = {
      displayName: typeof profileRaw.displayName === "string" ? profileRaw.displayName : null,
      skinType: typeof profileRaw.skinType === "string" ? profileRaw.skinType : "unknown",
      sensitivities: Array.isArray(profileRaw.sensitivities) ? profileRaw.sensitivities.filter(
        (x) => typeof x === "string"
      ) : [],
      goals: Array.isArray(profileRaw.goals) ? profileRaw.goals.filter(
        (x) => typeof x === "string"
      ) : []
    };
    const primaryConcern = typeof body["primaryConcern"] === "string" ? body["primaryConcern"] : null;
    const severityBand = typeof body["severityBand"] === "string" ? body["severityBand"] : null;
    const intentLabel = typeof body["intentLabel"] === "string" ? body["intentLabel"] : "best for your skin";
    const rawQuery = typeof body["rawQuery"] === "string" ? body["rawQuery"] : null;
    const chipIntent = typeof body["chipIntent"] === "string" ? body["chipIntent"] : null;
    const latestScanSummary = typeof body["latestScanSummary"] === "string" ? body["latestScanSummary"].slice(0, 320) : null;
    const topConcerns = Array.isArray(body["topConcerns"]) ? body["topConcerns"].filter(
      (x) => typeof x === "string"
    ) : [];
    const intentRaw = body["interpretedIntent"];
    let interpretedIntent;
    if (intentRaw && typeof intentRaw === "object" && !Array.isArray(intentRaw)) {
      const r = intentRaw;
      interpretedIntent = {
        mode: typeof r["mode"] === "string" ? r["mode"] : "vague_query",
        interpretedConcern: typeof r["interpretedConcern"] === "string" ? r["interpretedConcern"] : null,
        interpretedProductType: typeof r["interpretedProductType"] === "string" ? r["interpretedProductType"] : null,
        avoidanceConstraints: Array.isArray(r["avoidanceConstraints"]) ? r["avoidanceConstraints"].filter(
          (x) => typeof x === "string"
        ) : []
      };
    }
    const trustRaw = body["trustScores"];
    const trustScores = Array.isArray(trustRaw) ? trustRaw.filter(
      (x) => !!x && typeof x === "object"
    ).map((x) => ({
      id: typeof x.id === "string" ? x.id : "",
      trust: typeof x.trust === "number" && Number.isFinite(x.trust) ? Math.max(0, Math.min(100, x.trust)) : 0,
      hasImage: typeof x.hasImage === "boolean" ? x.hasImage : false
    })).filter((x) => x.id.length > 0) : [];
    const result = await withAIErrorTranslation(
      "rerankProducts",
      () => client.rerankProducts({
        candidates,
        profile,
        primaryConcern,
        severityBand,
        intentLabel,
        rawQuery,
        chipIntent,
        interpretedIntent,
        latestScanSummary,
        topConcerns,
        trustScores
      })
    );
    const validated = validateProductRerankResult(result);
    if (!validated) aiBad("rerankProducts");
    return validated;
  },
  // v19.43 — AI-first product recommendation planner.
  async recommendProductsForUser(client, body) {
    const queryRaw = body["query"];
    const query = typeof queryRaw === "string" && queryRaw.trim().length > 0 ? queryRaw.trim().slice(0, 200) : null;
    const profileRaw = body["profile"];
    const profile = {
      displayName: null,
      skinType: "unknown",
      sensitivities: [],
      goals: []
    };
    if (profileRaw && typeof profileRaw === "object") {
      const r = profileRaw;
      if (typeof r.displayName === "string") profile.displayName = r.displayName;
      if (typeof r.skinType === "string") profile.skinType = r.skinType;
      if (Array.isArray(r.sensitivities)) {
        profile.sensitivities = r.sensitivities.filter(
          (s) => typeof s === "string"
        );
      }
      if (Array.isArray(r.goals)) {
        profile.goals = r.goals.filter(
          (g) => typeof g === "string"
        );
      }
    }
    const topConcerns = Array.isArray(body["topConcerns"]) ? body["topConcerns"].filter(
      (c) => typeof c === "string"
    ) : [];
    const latestScanSummary = typeof body["latestScanSummary"] === "string" ? body["latestScanSummary"].slice(0, 320) : null;
    const sp = body["skinProfile"];
    let skinProfile;
    if (sp && typeof sp === "object") {
      const r = sp;
      skinProfile = {
        isOily: r.isOily === true,
        isAcneProne: r.isAcneProne === true,
        isDry: r.isDry === true,
        isBarrier: r.isBarrier === true,
        isSensitive: r.isSensitive === true,
        isCombo: r.isCombo === true,
        label: typeof r.label === "string" ? r.label : "unknown"
      };
    }
    const modeRaw = body["suggestedMode"];
    const suggestedMode = modeRaw === "best_for_you" || modeRaw === "query_driven_search" || modeRaw === "concern_focused_search" ? modeRaw : void 0;
    const result = await withAIErrorTranslation(
      "recommendProductsForUser",
      () => client.recommendProductsForUser({
        query,
        profile,
        topConcerns,
        latestScanSummary,
        skinProfile,
        suggestedMode
      })
    );
    const validated = validateProductRecommendationPlan(result);
    if (!validated) aiBad("recommendProductsForUser");
    return validated;
  },
  // v21.0 — AI slot selector handler. Pure pass-through; validation
  // is the same shape as the client expects.
  async selectProductForSlot(client, body) {
    const profileRaw = body["profile"];
    const profile = {
      displayName: null,
      skinType: "unknown",
      sensitivities: [],
      goals: []
    };
    if (profileRaw && typeof profileRaw === "object") {
      const r = profileRaw;
      if (typeof r.displayName === "string") profile.displayName = r.displayName;
      if (typeof r.skinType === "string") profile.skinType = r.skinType;
      if (Array.isArray(r.sensitivities)) {
        profile.sensitivities = r.sensitivities.filter(
          (s) => typeof s === "string"
        );
      }
      if (Array.isArray(r.goals)) {
        profile.goals = r.goals.filter(
          (g) => typeof g === "string"
        );
      }
    }
    const topConcerns = Array.isArray(body["topConcerns"]) ? body["topConcerns"].filter(
      (c) => typeof c === "string"
    ) : [];
    const latestScanSummary = typeof body["latestScanSummary"] === "string" ? body["latestScanSummary"].slice(0, 320) : null;
    const sp = body["skinProfile"];
    let skinProfile;
    if (sp && typeof sp === "object") {
      const r = sp;
      skinProfile = {
        isOily: r.isOily === true,
        isAcneProne: r.isAcneProne === true,
        isDry: r.isDry === true,
        isBarrier: r.isBarrier === true,
        isSensitive: r.isSensitive === true,
        isCombo: r.isCombo === true,
        label: typeof r.label === "string" ? r.label : "unknown"
      };
    }
    const slotShortlistsRaw = body["slotShortlists"];
    const slotShortlists = [];
    if (Array.isArray(slotShortlistsRaw)) {
      for (const s of slotShortlistsRaw) {
        if (!s || typeof s !== "object") continue;
        const r = s;
        const candidatesRaw = Array.isArray(r.candidates) ? r.candidates : [];
        const candidates = [];
        for (const c of candidatesRaw) {
          if (!c || typeof c !== "object") continue;
          const cr = c;
          if (typeof cr.id !== "string" || cr.id.trim().length === 0) continue;
          candidates.push({
            id: cr.id.trim(),
            brand: typeof cr.brand === "string" ? cr.brand : "",
            name: typeof cr.name === "string" ? cr.name : "",
            category: typeof cr.category === "string" ? cr.category : null,
            concernTags: Array.isArray(cr.concernTags) ? cr.concernTags.filter(
              (x) => typeof x === "string"
            ) : [],
            ingredientsHighlights: Array.isArray(cr.ingredientsHighlights) ? cr.ingredientsHighlights.filter(
              (x) => typeof x === "string"
            ) : [],
            shortDescription: typeof cr.shortDescription === "string" ? cr.shortDescription : ""
          });
        }
        slotShortlists.push({
          slotKey: typeof r.slotKey === "string" ? r.slotKey : "",
          slotLabel: typeof r.slotLabel === "string" ? r.slotLabel : "",
          targetNeed: typeof r.targetNeed === "string" ? r.targetNeed : "",
          mustHaveSignals: Array.isArray(r.mustHaveSignals) ? r.mustHaveSignals.filter(
            (x) => typeof x === "string"
          ) : [],
          avoidSignals: Array.isArray(r.avoidSignals) ? r.avoidSignals.filter(
            (x) => typeof x === "string"
          ) : [],
          candidates
        });
      }
    }
    const result = await withAIErrorTranslation(
      "selectProductForSlot",
      () => client.selectProductForSlot({
        profile,
        topConcerns,
        latestScanSummary,
        skinProfile,
        slotShortlists
      })
    );
    const validated = validateSlotSelectionResult(result);
    if (!validated) aiBad("selectProductForSlot");
    return validated;
  },
  // v22.1 — typed-search-only planner handler.
  async planTypedSearch(client, body) {
    const rawQueryRaw = body["rawQuery"];
    const rawQuery = typeof rawQueryRaw === "string" ? rawQueryRaw.slice(0, 200) : "";
    const profileRaw = body["profile"];
    const profile = {
      displayName: null,
      skinType: "unknown",
      sensitivities: [],
      goals: []
    };
    if (profileRaw && typeof profileRaw === "object") {
      const r = profileRaw;
      if (typeof r.displayName === "string") profile.displayName = r.displayName;
      if (typeof r.skinType === "string") profile.skinType = r.skinType;
      if (Array.isArray(r.sensitivities)) {
        profile.sensitivities = r.sensitivities.filter(
          (s) => typeof s === "string"
        );
      }
      if (Array.isArray(r.goals)) {
        profile.goals = r.goals.filter(
          (g) => typeof g === "string"
        );
      }
    }
    const topConcerns = Array.isArray(body["topConcerns"]) ? body["topConcerns"].filter(
      (c) => typeof c === "string"
    ) : [];
    const latestScanSummary = typeof body["latestScanSummary"] === "string" ? body["latestScanSummary"].slice(0, 320) : null;
    const sp = body["skinProfile"];
    let skinProfile;
    if (sp && typeof sp === "object") {
      const r = sp;
      skinProfile = {
        isOily: r.isOily === true,
        isAcneProne: r.isAcneProne === true,
        isDry: r.isDry === true,
        isBarrier: r.isBarrier === true,
        isSensitive: r.isSensitive === true,
        isCombo: r.isCombo === true,
        label: typeof r.label === "string" ? r.label : "unknown"
      };
    }
    const result = await withAIErrorTranslation(
      "planTypedSearch",
      () => client.planTypedSearch({
        rawQuery,
        profile,
        topConcerns,
        latestScanSummary,
        skinProfile
      })
    );
    const validated = validateSearchIntentPlan(result);
    if (!validated) aiBad("planTypedSearch");
    return validated;
  },
  async analyzeScannedProductAgainstUser(client, body) {
    const params = {
      imageBase64: reqString(body, "imageBase64"),
      mediaType: reqMediaType(body, "mediaType"),
      userContextSummary: reqString(body, "userContextSummary")
    };
    const result = await client.analyzeScannedProductAgainstUser(params);
    const validated = validateScannedProductFit(result);
    if (!validated) aiBad("analyzeScannedProductAgainstUser");
    return validated;
  },
  async buildFullScanToPlanBundle(client, body) {
    const params = {
      imageBase64: reqString(body, "imageBase64"),
      mediaType: reqMediaType(body, "mediaType"),
      scanId: reqString(body, "scanId"),
      previousSummary: optString(body, "previousSummary"),
      userProfileSummary: reqString(body, "userProfileSummary"),
      candidateProductsJson: reqString(body, "candidateProductsJson"),
      existingRoutineJson: reqString(body, "existingRoutineJson")
    };
    const result = await client.buildFullScanToPlanBundle(params);
    const validated = validateScanToPlanBundle(result);
    if (!validated) aiBad("buildFullScanToPlanBundle");
    return validated;
  },
  async buildProgressBundle(client, body) {
    const score = body["score"];
    if (typeof score !== "number" || !Number.isFinite(score)) {
      bad("score", "expected number");
    }
    const deltaValueRaw = body["deltaValue"];
    const deltaValue = deltaValueRaw === null ? null : typeof deltaValueRaw === "number" && Number.isFinite(deltaValueRaw) ? deltaValueRaw : bad("deltaValue", "expected number|null");
    const params = {
      baselineSummary: reqString(body, "baselineSummary"),
      latestSummary: reqString(body, "latestSummary"),
      concernMovementsJson: reqString(body, "concernMovementsJson"),
      score,
      deltaValue
    };
    const result = await client.buildProgressBundle(params);
    const validated = validateProgressBundle(result);
    if (!validated) aiBad("buildProgressBundle");
    return validated;
  }
};

// api/proxy/_handler.ts
var ALLOWED_METHODS = new Set(Object.keys(HANDLERS));
var MAX_BODY_BYTES = 12 * 1024 * 1024;
var RATE_WINDOW_MS = 6e4;
var RATE_MAX_PER_WINDOW = 60;
var rateBuckets = /* @__PURE__ */ new Map();
function rateLimit(ip) {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  const bucket = rateBuckets.get(ip) ?? [];
  let i = 0;
  while (i < bucket.length && bucket[i] < cutoff) i++;
  const recent = i === 0 ? bucket : bucket.slice(i);
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    const oldest = recent[0];
    return { allowed: false, retryAfter: Math.ceil((oldest + RATE_WINDOW_MS - now) / 1e3) };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { allowed: true, retryAfter: 0 };
}
function clientIp(headers) {
  const fwd = headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim();
  }
  const real = headers["x-real-ip"];
  if (typeof real === "string" && real.length > 0) return real;
  return "unknown";
}
var ALLOWED_ORIGINS = new Set(
  (process.env.PURA_AI_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter((s) => s.length > 0)
);
function resolveCorsOrigin(reqOrigin) {
  if (!reqOrigin) return null;
  return ALLOWED_ORIGINS.has(reqOrigin) ? reqOrigin : null;
}
var TOKEN = (process.env.PURA_AI_PROXY_TOKEN ?? "").trim();
function readBearer(headers) {
  const raw = headers["authorization"] ?? headers["Authorization"];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return "";
  const m = /^Bearer\s+(.+)$/.exec(v.trim());
  return m ? m[1].trim() : "";
}
var cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  cachedClient = createOpenAIClientFromEnv();
  return cachedClient;
}
function methodFromQuery(query) {
  const v = query.method;
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v.length > 0) return String(v[0]);
  return "";
}
function approximateBodySize(body) {
  if (body == null) return 0;
  if (typeof body === "string") return body.length;
  try {
    return JSON.stringify(body).length;
  } catch {
    return 0;
  }
}
async function handler(req, res) {
  const requestOrigin = (() => {
    const o = req.headers["origin"];
    return Array.isArray(o) ? o[0] : o;
  })();
  const requestedHandler = methodFromQuery(req.query);
  const contentLengthHeader = (() => {
    const c = req.headers["content-length"];
    return Array.isArray(c) ? c[0] : c;
  })();
  console.log("[Pura AI Production QA] request received", {
    method: req.method,
    handler: requestedHandler,
    origin: requestOrigin ?? null,
    contentLength: contentLengthHeader ?? null,
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    allowedOriginsConfigured: ALLOWED_ORIGINS.size
  });
  const allowed = resolveCorsOrigin(requestOrigin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Request-Id"
    );
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "POST required" });
    return;
  }
  const ip = clientIp(req.headers);
  const rl = rateLimit(ip);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    res.status(429).json({ error: "Too many requests" });
    return;
  }
  if (TOKEN.length > 0) {
    const supplied = readBearer(req.headers);
    if (supplied !== TOKEN) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  const method = methodFromQuery(req.query);
  if (!ALLOWED_METHODS.has(method)) {
    console.log("[Pura AI Production QA] unknown method rejected", {
      method,
      allowedCount: ALLOWED_METHODS.size
    });
    res.status(404).json({ error: "Unknown method" });
    return;
  }
  const handlerFn = HANDLERS[method];
  let body = req.body;
  if (typeof body === "string") {
    if (body.length > MAX_BODY_BYTES) {
      console.log("[Pura AI Production QA] payload too large (string)", {
        method,
        bytes: body.length,
        cap: MAX_BODY_BYTES
      });
      res.status(413).json({ error: "Payload too large" });
      return;
    }
    try {
      body = JSON.parse(body);
    } catch {
      console.log("[Pura AI Production QA] invalid JSON body", { method });
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  } else if (body && typeof body === "object") {
    if (approximateBodySize(body) > MAX_BODY_BYTES) {
      console.log("[Pura AI Production QA] payload too large (object)", {
        method,
        approxBytes: approximateBodySize(body),
        cap: MAX_BODY_BYTES
      });
      res.status(413).json({ error: "Payload too large" });
      return;
    }
  }
  if (body === void 0 || body === null) body = {};
  const parsedBody = body;
  const hasImagePayload = typeof parsedBody.imageBase64 === "string" && parsedBody.imageBase64.length > 0;
  const imagePayloadApproxBytes = hasImagePayload ? parsedBody.imageBase64.length : 0;
  console.log("[Pura AI Production QA] request parsed", {
    handler: method,
    hasImagePayload,
    imagePayloadApproxBytes,
    topLevelKeys: Object.keys(parsedBody)
  });
  const dispatchStart = Date.now();
  let openAiCompleted = false;
  try {
    const client = getClient();
    const result = await handlerFn(client, parsedBody);
    openAiCompleted = true;
    console.log("[Pura AI Production QA] openai call status", {
      handler: method,
      started: true,
      completed: openAiCompleted,
      durationMs: Date.now() - dispatchStart,
      topLevelKeysReturned: result && typeof result === "object" ? Object.keys(result) : []
    });
    res.status(200).json(result);
  } catch (err) {
    const safeErrorType = err instanceof HandlerError ? "handler_error" : err instanceof AIError ? "ai_error" : err instanceof Error ? err.constructor.name : "unknown";
    console.log("[Pura AI Production QA] openai call status", {
      handler: method,
      started: true,
      completed: openAiCompleted,
      durationMs: Date.now() - dispatchStart,
      errorType: safeErrorType,
      // err.message is author-curated for HandlerError/AIError; for
      // unknown errors it's still useful for debugging and contains
      // no secrets (the OpenAI client strips key from messages).
      safeErrorMessage: err instanceof Error ? err.message.slice(0, 200) : null
    });
    if (err instanceof HandlerError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof AIError) {
      console.log("[Pura AI Production QA] response validation", {
        handler: method,
        valid: false,
        reason: err.reason,
        schemaName: err.schemaName
      });
      res.status(502).json({
        error: "AI response invalid",
        reason: err.reason,
        schemaName: err.schemaName
      });
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/proxy]", method, "internal error:", message);
    res.status(500).json({ error: "Internal error" });
  }
}
/*! Bundled license information:

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
