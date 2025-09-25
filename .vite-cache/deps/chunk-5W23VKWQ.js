import {
  deepMerge,
  hasGetter,
  isIterable,
  isObject,
  isPlainObject,
  klona,
  safeAccess,
  safeSet
} from "./chunk-KPMOB2R4.js";
import {
  derived,
  writable
} from "./chunk-M2FRMPL5.js";
import {
  fade
} from "./chunk-MC3UIZRO.js";
import {
  easing_exports
} from "./chunk-WSHISOYD.js";
import {
  HtmlTag,
  SvelteComponentDev,
  action_destroyer,
  add_flush_callback,
  add_location,
  add_render_callback,
  append_dev,
  append_styles,
  assign,
  attr_dev,
  bind,
  binding_callbacks,
  bubble,
  check_outros,
  component_subscribe,
  construct_svelte_component_dev,
  create_component,
  create_in_transition,
  create_out_transition,
  create_slot,
  destroy_block,
  destroy_component,
  destroy_each,
  detach_dev,
  dispatch_dev,
  element,
  empty,
  ensure_array_like_dev,
  flush,
  getContext,
  get_all_dirty_from_scope,
  get_slot_changes,
  get_spread_object,
  get_spread_update,
  get_store_value,
  globals,
  group_outros,
  init,
  insert_dev,
  is_function,
  listen_dev,
  mount_component,
  noop,
  onDestroy,
  onMount,
  prevent_default,
  prop_dev,
  run_all,
  safe_not_equal,
  setContext,
  set_data_dev,
  set_style,
  space,
  src_url_equal,
  stop_propagation,
  subscribe,
  svg_element,
  text,
  toggle_class,
  transition_in,
  transition_out,
  update_keyed_each,
  update_slot_base,
  validate_each_keys,
  validate_slots,
  validate_store
} from "./chunk-GBPX7F5N.js";

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/util/index.js
function isWritableStore(store) {
  if (store === null || store === void 0) {
    return false;
  }
  switch (typeof store) {
    case "function":
    case "object":
      return typeof store.subscribe === "function" && typeof store.set === "function" && typeof store.update === "function";
  }
  return false;
}
function subscribeIgnoreFirst(store, update) {
  let firedFirst = false;
  return store.subscribe((value) => {
    if (!firedFirst) {
      firedFirst = true;
    } else {
      update(value);
    }
  });
}

// node_modules/@typhonjs-fvtt/runtime/_dist/util/browser/index.js
var CrossWindow = class {
  /**
   * @private
   */
  constructor() {
    throw new Error("CrossWindow constructor: This is a static class and should not be constructed.");
  }
  /**
   * Class names for all focusable element types.
   */
  static #FocusableElementClassNames = [
    "HTMLAnchorElement",
    "HTMLButtonElement",
    "HTMLDetailsElement",
    "HTMLEmbedElement",
    "HTMLIFrameElement",
    "HTMLInputElement",
    "HTMLObjectElement",
    "HTMLSelectElement",
    "HTMLTextAreaElement"
  ];
  /**
   * DOM nodes with defined `ownerDocument` property.
   */
  static #NodesWithOwnerDocument = /* @__PURE__ */ new Set([
    Node.ELEMENT_NODE,
    Node.TEXT_NODE,
    Node.COMMENT_NODE,
    Node.DOCUMENT_FRAGMENT_NODE
  ]);
  // Various UIEvent sets for duck typing by constructor name.
  /**
   * Duck typing class names for pointer events.
   */
  static #PointerEventSet = /* @__PURE__ */ new Set(["MouseEvent", "PointerEvent"]);
  /**
   * Duck typing class names for all UIEvents.
   */
  static #UIEventSet = /* @__PURE__ */ new Set([
    "UIEvent",
    "FocusEvent",
    "MouseEvent",
    "WheelEvent",
    "KeyboardEvent",
    "PointerEvent",
    "TouchEvent",
    "InputEvent",
    "CompositionEvent",
    "DragEvent"
  ]);
  /**
   * Duck typing class names for events considered as user input.
   */
  static #UserInputEventSet = /* @__PURE__ */ new Set(["KeyboardEvent", "MouseEvent", "PointerEvent"]);
  /**
   * Internal options used by `#checkDOMInstanceType` when retrieving the Window reference from a Node that doesn't
   * define `ownerDocument`.
   */
  static #optionsInternalCheckDOM = { throws: false };
  // DOM Querying ---------------------------------------------------------------------------------------------------
  /**
   * Convenience method to retrieve the `document.activeElement` value in the current Window context of a DOM Node /
   * Element, EventTarget, Document, or Window.
   *
   * @param target - DOM Node / Element, EventTarget, Document, UIEvent or Window to query.
   *
   * @param [options] - Options.
   *
   * @returns Active element or `undefined` when `throws` option is `false` and the target is invalid.
   *
   * @throws {@link TypeError} Target must be a DOM Node / Element, Document, UIEvent, or Window.
   */
  static getActiveElement(target, { throws = true } = {}) {
    if (this.#hasOwnerDocument(target)) {
      return target?.ownerDocument?.activeElement ?? null;
    }
    if (this.isUIEvent(target) && isObject(target?.view)) {
      return target?.view?.document?.activeElement ?? null;
    }
    if (this.isDocument(target)) {
      return target?.activeElement ?? null;
    }
    if (this.isWindow(target)) {
      return target?.document?.activeElement ?? null;
    }
    if (throws) {
      throw new TypeError(`'target' must be a DOM Node / Element, Document, UIEvent, or Window.`);
    }
    return void 0;
  }
  /**
   * Convenience method to retrieve the `Document` value in the current context of a DOM Node / Element, EventTarget,
   * Document, UIEvent, or Window.
   *
   * @param target - DOM Node / Element, EventTarget, Document, UIEvent or Window to query.
   *
   * @param [options] - Options.
   *
   * @returns {Document} Active document or `undefined` when `throws` option is `false` and the target is invalid.
   *
   * @throws {@link TypeError} Target must be a DOM Node / Element, Document, UIEvent, or Window.
   */
  static getDocument(target, { throws = true } = {}) {
    if (this.#hasOwnerDocument(target)) {
      return target?.ownerDocument;
    }
    if (this.isUIEvent(target) && isObject(target?.view)) {
      return target?.view?.document;
    }
    if (this.isDocument(target)) {
      return target;
    }
    if (this.isWindow(target)) {
      return target?.document;
    }
    if (throws) {
      throw new TypeError(`'target' must be a DOM Node / Element, Document, UIEvent, or Window.`);
    }
    return void 0;
  }
  /**
   * Convenience method to retrieve the `Window` value in the current context of a DOM Node / Element, EventTarget,
   * Document, or Window.
   *
   * @param target - DOM Node / Element, EventTarget, Document, UIEvent or Window to query.
   *
   * @param [options] - Options.
   *
   * @returns Active window or `undefined` when `throws` option is `false` and the target is invalid.
   *
   * @throws {@link TypeError} Target must be a DOM Node / Element, Document, UIEvent, or Window.
   */
  static getWindow(target, { throws = true } = {}) {
    if (this.#hasOwnerDocument(target)) {
      return target.ownerDocument?.defaultView ?? globalThis;
    }
    if (this.isUIEvent(target) && isObject(target?.view)) {
      return target.view ?? globalThis;
    }
    if (this.isDocument(target)) {
      return target.defaultView ?? globalThis;
    }
    if (this.isWindow(target)) {
      return target;
    }
    if (throws) {
      throw new TypeError(`'target' must be a DOM Node / Element, Document, UIEvent, or Window.`);
    }
    return void 0;
  }
  // ES / Browser API basic prototype tests -------------------------------------------------------------------------
  /**
   * Provides basic prototype string type checking if `target` is a CSSImportRule.
   *
   * @param target - A potential CSSImportRule to test.
   *
   * @returns Is `target` a CSSImportRule.
   */
  static isCSSImportRule(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object CSSImportRule]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a CSSLayerBlockRule.
   *
   * @param target - A potential CSSLayerBlockRule to test.
   *
   * @returns Is `target` a CSSLayerBlockRule.
   */
  static isCSSLayerBlockRule(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object CSSLayerBlockRule]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a CSSStyleRule.
   *
   * @param target - A potential CSSStyleRule to test.
   *
   * @returns Is `target` a CSSStyleRule.
   */
  static isCSSStyleRule(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object CSSStyleRule]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a CSSStyleSheet.
   *
   * @param target - A potential CSSStyleSheet to test.
   *
   * @returns Is `target` a CSSStyleSheet.
   */
  static isCSSStyleSheet(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object CSSStyleSheet]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a Document.
   *
   * @param target - A potential Document to test.
   *
   * @returns Is `target` a Document.
   */
  static isDocument(target) {
    return isObject(target) && /^\[object (HTML)?Document]$/.test(Object.prototype.toString.call(target));
  }
  /**
   * Provides basic prototype string type checking if `target` is a Map.
   *
   * @param target - A potential Map to test.
   *
   * @returns Is `target` a Map.
   */
  static isMap(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object Map]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a Promise.
   *
   * @param target - A potential Promise to test.
   *
   * @returns Is `target` a Promise.
   */
  static isPromise(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object Promise]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a RegExp.
   *
   * @param target - A potential RegExp to test.
   *
   * @returns Is `target` a RegExp.
   */
  static isRegExp(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object RegExp]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a Set.
   *
   * @param target - A potential Set to test.
   *
   * @returns Is `target` a Set.
   */
  static isSet(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object Set]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a URL.
   *
   * @param target - A potential URL to test.
   *
   * @returns Is `target` a URL.
   */
  static isURL(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object URL]";
  }
  /**
   * Provides basic prototype string type checking if `target` is a Window.
   *
   * @param target - A potential Window to test.
   *
   * @returns Is `target` a Window.
   */
  static isWindow(target) {
    return isObject(target) && Object.prototype.toString.call(target) === "[object Window]";
  }
  // DOM Element typing ---------------------------------------------------------------------------------------------
  /**
   * Ensures that the given target is an `instanceof` all known DOM elements that are focusable. Please note that
   * additional checks are required regarding focusable state; use {@link A11yHelper.isFocusable} for a complete check.
   *
   * @param target - Target to test for `instanceof` focusable HTML element.
   *
   * @returns Is target an `instanceof` a focusable DOM element.
   */
  static isFocusableHTMLElement(target) {
    for (let cntr = this.#FocusableElementClassNames.length; --cntr >= 0; ) {
      if (this.#checkDOMInstanceType(target, Node.ELEMENT_NODE, this.#FocusableElementClassNames[cntr])) {
        return true;
      }
    }
    return false;
  }
  /**
   * Provides precise type checking if `target` is a DocumentFragment.
   *
   * @param target - A potential DocumentFragment to test.
   *
   * @returns Is `target` a DocumentFragment.
   */
  static isDocumentFragment(target) {
    return this.#checkDOMInstanceType(target, Node.DOCUMENT_FRAGMENT_NODE, "DocumentFragment");
  }
  /**
   * Provides precise type checking if `target` is an Element.
   *
   * @param target - A potential Element to test.
   *
   * @returns Is `target` an Element.
   */
  static isElement(target) {
    return this.#checkDOMInstanceType(target, Node.ELEMENT_NODE, "Element");
  }
  /**
   * Provides precise type checking if `target` is a HTMLAnchorElement.
   *
   * @param target - A potential HTMLAnchorElement to test.
   *
   * @returns Is `target` a HTMLAnchorElement.
   */
  static isHTMLAnchorElement(target) {
    return this.#checkDOMInstanceType(target, Node.ELEMENT_NODE, "HTMLAnchorElement");
  }
  /**
   * Provides precise type checking if `target` is an HTMLElement.
   *
   * @param target - A potential HTMLElement to test.
   *
   * @returns Is `target` a HTMLElement.
   */
  static isHTMLElement(target) {
    return this.#checkDOMInstanceType(target, Node.ELEMENT_NODE, "HTMLElement");
  }
  /**
   * Provides precise type checking if `target` is a Node.
   *
   * @param target - A potential Node to test.
   *
   * @returns Is `target` a DOM Node.
   */
  static isNode(target) {
    if (typeof target?.nodeType !== "number") {
      return false;
    }
    if (target instanceof globalThis.Node) {
      return true;
    }
    const activeWindow = this.getWindow(target, this.#optionsInternalCheckDOM);
    const TargetNode = activeWindow?.Node;
    return TargetNode && target instanceof TargetNode;
  }
  /**
   * Provides precise type checking if `target` is a ShadowRoot.
   *
   * @param target - A potential ShadowRoot to test.
   *
   * @returns Is `target` a ShadowRoot.
   */
  static isShadowRoot(target) {
    return this.#checkDOMInstanceType(target, Node.DOCUMENT_FRAGMENT_NODE, "ShadowRoot");
  }
  /**
   * Provides precise type checking if `target` is a SVGElement.
   *
   * @param target - A potential SVGElement to test.
   *
   * @returns Is `target` a SVGElement.
   */
  static isSVGElement(target) {
    return this.#checkDOMInstanceType(target, Node.ELEMENT_NODE, "SVGElement");
  }
  // Event typing ---------------------------------------------------------------------------------------------------
  /**
   * Provides basic duck type checking for `Event` signature and optional constructor name(s).
   *
   * @param target - A potential DOM event to test.
   *
   * @param [types] Specific constructor name or Set of constructor names to match.
   *
   * @returns Is `target` an Event with optional constructor name check.
   */
  static isEvent(target, types) {
    if (typeof target?.type !== "string" || typeof target?.defaultPrevented !== "boolean" || typeof target?.stopPropagation !== "function") {
      return false;
    }
    return types !== void 0 ? this.isCtorName(target, types) : true;
  }
  /**
   * Provides basic duck type checking for `Event` signature for standard mouse / pointer events including
   * `MouseEvent` and `PointerEvent`.
   *
   * @param target - A potential DOM event to test.
   *
   * @returns Is `target` a MouseEvent or PointerEvent.
   */
  static isPointerEvent(target) {
    return this.isEvent(target, this.#PointerEventSet);
  }
  /**
   * Provides basic duck type checking for `Event` signature for all UI events.
   *
   * @param target - A potential DOM event to test.
   *
   * @returns Is `target` a UIEvent.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/UIEvent
   */
  static isUIEvent(target) {
    return this.isEvent(target, this.#UIEventSet);
  }
  /**
   * Provides basic duck type checking for `Event` signature for standard user input events including `KeyboardEvent`,
   * `MouseEvent`, and `PointerEvent`.
   *
   * @param target - A potential DOM event to test.
   *
   * @returns Is `target` a Keyboard, MouseEvent, or PointerEvent.
   */
  static isUserInputEvent(target) {
    return this.isEvent(target, this.#UserInputEventSet);
  }
  // Generic typing -------------------------------------------------------------------------------------------------
  /**
   * Provides basic type checking by constructor name(s) for objects. This can be useful when checking multiple
   * constructor names against a provided Set.
   *
   * @param target - Object to test for constructor name.
   *
   * @param types Specific constructor name or Set of constructor names to match.
   *
   * @returns Does the provided object constructor name match the types provided.
   */
  static isCtorName(target, types) {
    if (!isObject(target)) {
      return false;
    }
    if (typeof types === "string" && target?.constructor?.name === types) {
      return true;
    }
    return !!types?.has(target?.constructor?.name);
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Internal generic DOM `instanceof` check. First will attempt to find the class name by `globalThis` falling back
   * to the {@link Window} associated with the DOM node.
   *
   * @param target - Target to test.
   *
   * @param nodeType - Node type constant.
   *
   * @param className - DOM classname for instanceof check.
   *
   * @returns Is the target the given nodeType and instance of class name.
   */
  static #checkDOMInstanceType(target, nodeType, className) {
    if (!isObject(target)) {
      return false;
    }
    if (target.nodeType !== nodeType) {
      return false;
    }
    const GlobalClass = window[className];
    if (GlobalClass && target instanceof GlobalClass) {
      return true;
    }
    const activeWindow = this.#hasOwnerDocument(target) ? target?.ownerDocument?.defaultView : (
      // @ts-ignore: Safe in this context.
      this.getWindow(target, this.#optionsInternalCheckDOM)
    );
    const TargetClass = activeWindow?.[className];
    return TargetClass && target instanceof TargetClass;
  }
  static #hasOwnerDocument(target) {
    return typeof target === "object" && target !== null && this.#NodesWithOwnerDocument.has(target?.nodeType);
  }
};
var URLParser = class {
  /**
   * @private
   */
  constructor() {
  }
  // eslint-disable-line no-useless-constructor
  /**
   * Parses a URL string converting it to a fully qualified URL. If URL is an existing URL instance, it is returned
   * immediately. Optionally, you may construct a fully qualified URL from a relative base origin / path or with a
   * route prefix added to the current location origin.
   *
   * @param options - Options.
   *
   * @param options.url - URL string to convert to a URL.
   *
   * @param [options.base] - Optional fully qualified base path for relative URL construction.
   *
   * @param [options.routePrefix] - Optional route prefix to add to location origin for absolute URL strings
   *        when `base` is not defined.
   *
   * @returns Parsed URL or null if `url` is not parsed.
   */
  static parse({ url, base, routePrefix }) {
    if (CrossWindow.isURL(url)) {
      return url;
    }
    if (typeof url !== "string") {
      return null;
    }
    if (base !== void 0 && typeof base !== "string") {
      return null;
    }
    if (routePrefix !== void 0 && typeof routePrefix !== "string") {
      return null;
    }
    const targetURL = this.#createURL(url);
    if (targetURL) {
      return targetURL;
    }
    let targetBase;
    if (url.startsWith("./") || url.startsWith("../")) {
      targetBase = base ? base : `${globalThis.location.origin}${globalThis.location.pathname}`;
    } else {
      let targetRoutePrefix = "";
      if (routePrefix) {
        targetRoutePrefix = routePrefix.startsWith("/") ? routePrefix : `/${routePrefix}`;
        targetRoutePrefix = targetRoutePrefix.endsWith("/") ? targetRoutePrefix : `${targetRoutePrefix}/`;
      }
      targetBase = `${globalThis.location.origin}${targetRoutePrefix}`;
    }
    return this.#createURL(url, targetBase);
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Helper to create a URL and catch any exception. Useful until `URL.parse` and `URL.canParse` are more widespread.
   *
   * @param url - URL string.
   *
   * @param base - Base origin / path.
   *
   * @returns Valid URL or null.
   */
  static #createURL(url, base = "") {
    try {
      return new URL(url, base);
    } catch (err) {
      return null;
    }
  }
};
var AssetValidator = class {
  /** Supported media types. */
  static #allMediaTypes = /* @__PURE__ */ new Set(["audio", "img", "svg", "video"]);
  /** Supported audio extensions. */
  static #audioExtensions = /* @__PURE__ */ new Set(["mp3", "wav", "ogg", "aac", "flac", "webm"]);
  /** Supported image extensions. */
  static #imageExtensions = /* @__PURE__ */ new Set(["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"]);
  /** Supported SVG extensions. */
  static #svgExtensions = /* @__PURE__ */ new Set(["svg"]);
  /** Supported video extensions. */
  static #videoExtensions = /* @__PURE__ */ new Set(["mp4", "webm", "ogg"]);
  /**
   * @private
   */
  constructor() {
  }
  // eslint-disable-line no-useless-constructor
  /**
   * Parses the provided file path to determine the media type and validity based on the file extension. Certain
   * extensions can be excluded in addition to filtering by specified media types.
   *
   * @privateRemarks
   * TODO: create type information when made public.
   *
   * @param options - Options.
   *
   * @returns The parsed asset information containing the file path, extension, element type, and whether the parsing
   *          is valid for the file extension is supported and not excluded.
   *
   * @throws {TypeError} If the provided `url` is not a string or URL, `routePrefix` is not a string,
   *         `exclude` is not a Set, or `mediaTypes` is not a Set.
   */
  static parseMedia({ url, routePrefix, exclude, mediaTypes = this.#allMediaTypes, raiseException = false }) {
    const throws = typeof raiseException === "boolean" ? raiseException : true;
    if (typeof url !== "string" && !CrossWindow.isURL(url)) {
      if (throws) {
        throw new TypeError(`'url' is not a string or URL instance.`);
      } else {
        return { url, valid: false };
      }
    }
    if (routePrefix !== void 0 && typeof routePrefix !== "string") {
      if (throws) {
        throw new TypeError(`'routePrefix' is not a string.`);
      } else {
        return { url, valid: false };
      }
    }
    if (exclude !== void 0 && !CrossWindow.isSet(exclude)) {
      if (throws) {
        throw new TypeError(`'exclude' is not a Set.`);
      } else {
        return { url, valid: false };
      }
    }
    if (!CrossWindow.isSet(mediaTypes)) {
      if (throws) {
        throw new TypeError(`'mediaTypes' is not a Set.`);
      } else {
        return { url, valid: false };
      }
    }
    const targetURL = typeof url === "string" ? URLParser.parse({ url, routePrefix }) : url;
    if (!targetURL) {
      if (throws) {
        throw new TypeError(`'url' is invalid.`);
      } else {
        return { url, valid: false };
      }
    }
    const extensionMatch = targetURL.pathname.match(/\.([a-zA-Z0-9]+)$/);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : void 0;
    const isExcluded = extension && CrossWindow.isSet(exclude) ? exclude.has(extension) : false;
    let elementType = void 0;
    let valid = false;
    if (extension && !isExcluded) {
      if (this.#svgExtensions.has(extension) && mediaTypes.has("svg")) {
        elementType = "svg";
        valid = true;
      } else if (this.#imageExtensions.has(extension) && mediaTypes.has("img")) {
        elementType = "img";
        valid = true;
      } else if (this.#videoExtensions.has(extension) && mediaTypes.has("video")) {
        elementType = "video";
        valid = true;
      } else if (this.#audioExtensions.has(extension) && mediaTypes.has("audio")) {
        elementType = "audio";
        valid = true;
      }
    }
    return valid ? {
      src: url,
      url: targetURL,
      extension,
      elementType,
      valid
    } : { url, valid: false };
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/web-storage/index.js
function storeGenerator({ storage, serialize = JSON.stringify, deserialize = JSON.parse }) {
  function isSimpleDeriver(deriver) {
    return deriver.length < 2;
  }
  function storageReadable(key, value, start) {
    return {
      subscribe: storageWritable(key, value, start).subscribe
    };
  }
  function storageWritable(key, value, start) {
    function wrap_start(ogSet) {
      return start(function wrap_set(new_value) {
        if (storage) {
          storage.setItem(key, serialize(new_value));
        }
        return ogSet(new_value);
      }, function wrap_update(fn) {
        set(fn(get_store_value(ogStore)));
      });
    }
    if (storage) {
      const storageValue = storage.getItem(key);
      try {
        if (storageValue) {
          value = deserialize(storageValue);
        }
      } catch (err) {
      }
      storage.setItem(key, serialize(value));
    }
    const ogStore = writable(value, start ? wrap_start : void 0);
    function set(new_value) {
      if (storage) {
        storage.setItem(key, serialize(new_value));
      }
      ogStore.set(new_value);
    }
    function update(fn) {
      set(fn(get_store_value(ogStore)));
    }
    function subscribe2(run, invalidate) {
      return ogStore.subscribe(run, invalidate);
    }
    return { set, update, subscribe: subscribe2 };
  }
  function storageDerived(key, stores, fn, initial_value) {
    const single = !Array.isArray(stores);
    const stores_array = single ? [stores] : stores;
    if (storage && storage.getItem(key)) {
      try {
        initial_value = deserialize(storage.getItem(key));
      } catch (err) {
      }
    }
    return storageReadable(key, initial_value, (set, update) => {
      let inited = false;
      const values = [];
      let pending = 0;
      let cleanup;
      const sync = () => {
        if (pending) {
          return;
        }
        cleanup?.();
        const input = single ? values[0] : values;
        if (isSimpleDeriver(fn)) {
          set(fn(input));
        } else {
          const result = fn(input, set, update);
          if (typeof result === "function") {
            cleanup = result;
          }
        }
      };
      const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
        values[i] = value;
        pending &= ~(1 << i);
        if (inited) {
          sync();
        }
      }, () => {
        pending |= 1 << i;
      }));
      inited = true;
      sync();
      return function stop() {
        unsubscribers.forEach((unsubscriber) => unsubscriber());
        cleanup?.();
      };
    });
  }
  return {
    readable: storageReadable,
    writable: storageWritable,
    derived: storageDerived,
    storage,
    serialize,
    deserialize
  };
}
var localStores = storeGenerator({ storage: globalThis?.localStorage });
localStores.derived;
localStores.readable;
localStores.writable;
var sessionStores = storeGenerator({ storage: globalThis?.sessionStorage });
sessionStores.derived;
sessionStores.readable;
sessionStores.writable;
var TJSWebStorage = class {
  /** @type {import('./').StorageStores} */
  #storageStores;
  /**
   * @type {(Map<string, {
   *    store: import('svelte/store').Writable,
   *    deserialize?: (value: string, ...rest: any[]) => any,
   *    serialize?: (value: any, ...rest: any[]) => string
   * }>)}
   */
  #stores = /* @__PURE__ */ new Map();
  /**
   * @param {import('./').StorageStores} storageStores - Provides a complete set of
   *        storage API store helper functions and the associated storage API instance and serializations strategy.
   */
  constructor(storageStores) {
    this.#storageStores = storageStores;
  }
  /**
   * Creates a new store for the given key.
   *
   * @template T
   *
   * @param {string}   key - Key to lookup in stores map.
   *
   * @param {T}        [defaultValue] - A default value to set for the store.
   *
   * @param {import('./').StorageStores} [storageStores] - Additional store creation options.
   *
   * @returns {import('svelte/store').Writable<T>} The new store.
   */
  #createStore(key, defaultValue = void 0, storageStores) {
    try {
      const value = this.#storageStores.storage.getItem(key);
      if (value !== null) {
        const deserialize = storageStores?.deserialize ?? this.#storageStores.deserialize;
        defaultValue = deserialize(value);
      }
    } catch (err) {
    }
    const writable2 = storageStores?.writable ?? this.#storageStores.writable;
    return writable2(key, defaultValue);
  }
  /**
   * @param {string}   key - Storage key.
   *
   * @returns {(value: string, ...rest: any[]) => any} Deserialize function.
   */
  #getDeserialize(key) {
    return this.#stores.get(key)?.deserialize ?? this.#storageStores.deserialize;
  }
  /**
   * @param {string}   key - Storage key.
   *
   * @returns {(value: any, ...rest: any[]) => string} Serialize function.
   */
  #getSerialize(key) {
    return this.#stores.get(key)?.serialize ?? this.#storageStores.serialize;
  }
  /**
   * Gets a store from the `stores` Map or creates a new store for the key and a given default value.
   *
   * @template T
   *
   * @param {string}   key - Key to lookup in stores map.
   *
   * @param {T}        [defaultValue] - A default value to set for the store.
   *
   * @param {import('./').StorageStores} [storageStores] - Additional store creation options.
   *
   * @returns {import('svelte/store').Writable<T>} The store for the given key.
   */
  #getStore(key, defaultValue = void 0, storageStores) {
    const storeEntry = this.#stores.get(key);
    if (storeEntry) {
      return storeEntry.store;
    }
    const store = this.#createStore(key, defaultValue, storageStores);
    this.#stores.set(key, {
      store,
      deserialize: storageStores?.deserialize,
      serialize: storageStores?.serialize
    });
    return store;
  }
  /**
   * Get value from the storage API.
   *
   * @param {string}   key - Key to lookup in storage API.
   *
   * @param {*}        [defaultValue] - A default value to return if key not present in session storage.
   *
   * @returns {*} Value from session storage or if not defined any default value provided.
   */
  getItem(key, defaultValue) {
    let value = defaultValue;
    const storageValue = this.#storageStores.storage.getItem(key);
    if (storageValue !== null) {
      try {
        value = this.#getDeserialize(key)(storageValue);
      } catch (err) {
        value = defaultValue;
      }
    } else if (defaultValue !== void 0) {
      try {
        const newValue = this.#getSerialize(key)(defaultValue);
        this.#storageStores.storage.setItem(key, newValue);
      } catch (err) {
      }
    }
    return value;
  }
  /**
   * Returns the backing Svelte store for the given key; potentially sets a default value if the key
   * is not already set.
   *
   * @template T
   *
   * @param {string}   key - Key to lookup in storage API.
   *
   * @param {T}        [defaultValue] - A default value to return if key not present in session storage.
   *
   * @param {import('./').StorageStores} [storageStores] - Additional store creation options.
   *
   * @returns {import('svelte/store').Writable<T>} The Svelte store for this key.
   */
  getStore(key, defaultValue, storageStores) {
    return this.#getStore(key, defaultValue, storageStores);
  }
  /**
   * Returns whether a store has already been created for the given key.
   *
   * @param {string}   key - Key to lookup in storage API.
   */
  hasStore(key) {
    return this.#stores.has(key);
  }
  /**
   * Sets the value for the given key in storage API.
   *
   * @param {string}   key - Key to lookup in storage API.
   *
   * @param {*}        value - A value to set for this key.
   */
  setItem(key, value) {
    const store = this.#getStore(key);
    store.set(value);
  }
  /**
   * Convenience method to swap a boolean value stored in storage API updating the associated store value.
   *
   * @param {string}   key - Key to lookup in storage API.
   *
   * @param {boolean}  [defaultValue] - A default value to return if key not present in session storage.
   *
   * @returns {boolean} The boolean swap for the given key.
   */
  swapItemBoolean(key, defaultValue) {
    const store = this.#getStore(key, defaultValue);
    let currentValue = false;
    try {
      currentValue = !!this.#getDeserialize(key)(this.#storageStores.storage.getItem(key));
    } catch (err) {
    }
    const newValue = typeof currentValue === "boolean" ? !currentValue : false;
    store.set(newValue);
    return newValue;
  }
  // Iterators ------------------------------------------------------------------------------------------------------
  /**
   * @template T
   *
   * Returns an iterable for the session storage keys and stores.
   *
   * @param {RegExp} [regex] - Optional regular expression to filter by storage keys.
   *
   * @returns {IterableIterator<[string, import('svelte/store').Writable<T>]>} Iterable iterator of keys and stores.
   * @yields {import('svelte/store').Writable<[string, Writable<T>]>}
   */
  *entries(regex = void 0) {
    if (regex !== void 0 && !CrossWindow.isRegExp(regex)) {
      throw new TypeError(`'regex' is not a RegExp`);
    }
    if (!this.#stores.size) {
      return void 0;
    }
    if (regex) {
      for (const key of this.#stores.keys()) {
        if (regex.test(key)) {
          yield [key, this.getStore(key)];
        }
      }
    } else {
      for (const key of this.#stores.keys()) {
        yield [key, this.getStore(key)];
      }
    }
  }
  /**
   * Returns an iterable for the session storage keys from existing stores.
   *
   * @param {RegExp} [regex] - Optional regular expression to filter by storage keys.
   *
   * @returns {IterableIterator<string>} Iterable iterator of session storage keys.
   * @yields {string}
   */
  *keys(regex = void 0) {
    if (regex !== void 0 && !CrossWindow.isRegExp(regex)) {
      throw new TypeError(`'regex' is not a RegExp`);
    }
    if (!this.#stores.size) {
      return void 0;
    }
    if (regex) {
      for (const key of this.#stores.keys()) {
        if (regex.test(key)) {
          yield key;
        }
      }
    } else {
      for (const key of this.#stores.keys()) {
        yield key;
      }
    }
  }
  /**
   * @template T
   *
   * Returns an iterable for the session storage stores.
   *
   * @param {RegExp} [regex] - Optional regular expression to filter by storage keys.
   *
   * @returns {IterableIterator<import('svelte/store').Writable<T>>} Iterable iterator of stores.
   * @yields {import('svelte/store').Writable<T>}
   */
  *stores(regex = void 0) {
    if (regex !== void 0 && !CrossWindow.isRegExp(regex)) {
      throw new TypeError(`'regex' is not a RegExp`);
    }
    if (!this.#stores.size) {
      return void 0;
    }
    if (regex) {
      for (const key of this.#stores.keys()) {
        if (regex.test(key)) {
          yield this.getStore(key);
        }
      }
    } else {
      for (const key of this.#stores.keys()) {
        yield this.getStore(key);
      }
    }
  }
};
var TJSSessionStorage = class extends TJSWebStorage {
  constructor() {
    super(sessionStores);
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/writable-derived/index.js
function writableDerived(origins, derive, reflect, initial) {
  var childDerivedSetter, originValues, blockNextDerive = false;
  var reflectOldValues = reflect.length >= 2;
  var wrappedDerive = (got, set, update2) => {
    childDerivedSetter = set;
    if (reflectOldValues) {
      originValues = got;
    }
    if (!blockNextDerive) {
      let returned = derive(got, set, update2);
      if (derive.length < 2) {
        set(returned);
      } else {
        return returned;
      }
    }
    blockNextDerive = false;
  };
  var childDerived = derived(origins, wrappedDerive, initial);
  var singleOrigin = !Array.isArray(origins);
  function doReflect(reflecting) {
    var setWith = reflect(reflecting, originValues);
    if (singleOrigin) {
      blockNextDerive = true;
      origins.set(setWith);
    } else {
      setWith.forEach((value, i) => {
        blockNextDerive = true;
        origins[i].set(value);
      });
    }
    blockNextDerive = false;
  }
  var tryingSet = false;
  function update(fn) {
    var isUpdated, mutatedBySubscriptions, oldValue, newValue;
    if (tryingSet) {
      newValue = fn(get_store_value(childDerived));
      childDerivedSetter(newValue);
      return;
    }
    var unsubscribe = childDerived.subscribe((value) => {
      if (!tryingSet) {
        oldValue = value;
      } else if (!isUpdated) {
        isUpdated = true;
      } else {
        mutatedBySubscriptions = true;
      }
    });
    newValue = fn(oldValue);
    tryingSet = true;
    childDerivedSetter(newValue);
    unsubscribe();
    tryingSet = false;
    if (mutatedBySubscriptions) {
      newValue = get_store_value(childDerived);
    }
    if (isUpdated) {
      doReflect(newValue);
    }
  }
  return {
    subscribe: childDerived.subscribe,
    set(value) {
      update(() => value);
    },
    update
  };
}
function propertyStore(origin, propName) {
  if (!Array.isArray(propName)) {
    return writableDerived(
      origin,
      (object) => object[propName],
      (reflecting, object) => {
        object[propName] = reflecting;
        return object;
      }
    );
  } else {
    let props = propName.concat();
    return writableDerived(
      origin,
      (value) => {
        for (let i = 0; i < props.length; ++i) {
          value = value[props[i]];
        }
        return value;
      },
      (reflecting, object) => {
        let target = object;
        for (let i = 0; i < props.length - 1; ++i) {
          target = target[props[i]];
        }
        target[props[props.length - 1]] = reflecting;
        return object;
      }
    );
  }
}

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/util/index.js
var APIConfig = class {
  constructor() {
  }
  /**
   * Validates `config` argument whether it is a valid {@link TJSSvelte.Config.Dynamic} or
   * {@link TJSSvelte.Config.Standard} configuration object suitable for parsing by
   * {@link TJSSvelte.API.Config.parseConfig}.
   *
   * @param config - The potential config object to validate.
   *
   * @param [options] - Options.
   *
   * @param [options.raiseException=false] - If validation fails raise an exception.
   *
   * @returns Is the config a valid TJSSvelte.Config.Dynamic or TJSSvelte.Config.Standard configuration object.
   *
   * @throws {TypeError}  Any validation error when `raiseException` is enabled.
   */
  static isConfig(config, { raiseException = false } = {}) {
    if (!isObject(config)) {
      if (raiseException) {
        throw new TypeError(`TJSSvelte.config.isConfig error: 'config' is not an object.`);
      }
      return false;
    }
    if (!TJSSvelte.util.isComponent(config.class)) {
      if (raiseException) {
        throw new TypeError(`TJSSvelte.config.isConfig error: 'config.class' is not a Svelte component constructor.`);
      }
      return false;
    }
    return true;
  }
  /**
   * Validates `config` argument whether it is a valid {@link TJSSvelte.Config.Embed} configuration object
   * suitable for directly mounting via the `<svelte:component>` directive.
   *
   * @param config - The potential config object to validate.
   *
   * @param [options] - Options.
   *
   * @param [options.raiseException=false] - If validation fails raise an exception.
   *
   * @returns Is the config a valid TJSSvelte.Config.Embed configuration object.
   *
   * @throws {TypeError}  Any validation error when `raiseException` is enabled.
   */
  static isConfigEmbed(config, { raiseException = false } = {}) {
    if (!isObject(config)) {
      if (raiseException) {
        throw new TypeError(`TJSSvelte.config.isConfigEmbed error: 'config' is not an object.`);
      }
      return false;
    }
    if (!TJSSvelte.util.isComponent(config.class)) {
      if (raiseException) {
        throw new TypeError(`TJSSvelte.config.isConfigEmbed error: 'config.class' is not a Svelte component constructor.`);
      }
      return false;
    }
    if (config.props !== void 0 && !isObject(config.props)) {
      if (raiseException) {
        throw new TypeError(`TJSSvelte.config.isConfigEmbed error: 'config.props' is not an object.`);
      }
      return false;
    }
    return true;
  }
  /**
   * Parses a TyphonJS Svelte dynamic or standard config object ensuring that the class specified is a Svelte
   * component, loads any dynamic defined `context` or `props` preparing the config object for loading into the
   * Svelte component.
   *
   * @param config - Svelte config object.
   *
   * @param [options] - Options.
   *
   * @param [options.contextExternal] - When true any context data provided will be loaded into `#external`
   *        context separating it from any internal context created by the component.
   *
   * @param [options.thisArg] - `This` reference to set for invoking any `context` or `props` defined as
   *        functions for {@link Config.Dynamic} configuration objects.
   *
   * @returns The processed Svelte config object turned with parsed `props` & `context` converted into the format
   *          supported by Svelte.
   */
  static parseConfig(config, { contextExternal = false, thisArg = void 0 } = {}) {
    if (!isObject(config)) {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'config' is not an object:
${JSON.stringify(config)}.`);
    }
    if (!TJSSvelte.util.isComponent(config.class)) {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'class' is not a Svelte component constructor for config:
${JSON.stringify(config)}.`);
    }
    if (config.hydrate !== void 0 && typeof config.hydrate !== "boolean") {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'hydrate' is not a boolean for config:
${JSON.stringify(config)}.`);
    }
    if (config.intro !== void 0 && typeof config.intro !== "boolean") {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'intro' is not a boolean for config:
${JSON.stringify(config)}.`);
    }
    if (config.target !== void 0 && !CrossWindow.isElement(config.target) && !CrossWindow.isShadowRoot(config.target) && !CrossWindow.isDocumentFragment(config.target)) {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'target' is not a Element, ShadowRoot, or DocumentFragment for config:
${JSON.stringify(config)}.`);
    }
    if (config.anchor !== void 0 && !CrossWindow.isElement(config.anchor) && !CrossWindow.isShadowRoot(config.anchor) && !CrossWindow.isDocumentFragment(config.anchor)) {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'anchor' is not a string, Element for config:
${JSON.stringify(config)}.`);
    }
    if (config.context !== void 0 && typeof config.context !== "function" && !isObject(config.context)) {
      throw new TypeError(`TJSSvelte.config.parseConfig - 'context' is not a function or object for config:
${JSON.stringify(config)}.`);
    }
    const svelteConfig = { ...config };
    let context = {};
    if (typeof svelteConfig.context === "function") {
      const contextFunc = svelteConfig.context;
      delete svelteConfig.context;
      const result = contextFunc.call(thisArg);
      if (isObject(result)) {
        context = { ...result };
      } else {
        throw new Error(`TJSSvelte.config.parseConfig - 'context' is a function that did not return an object for config:
${JSON.stringify(config)}`);
      }
    } else if (isObject(svelteConfig.context)) {
      context = svelteConfig.context;
      delete svelteConfig.context;
    }
    svelteConfig.props = this.#processProps(svelteConfig.props, thisArg, config);
    if (contextExternal) {
      svelteConfig.context = /* @__PURE__ */ new Map();
      svelteConfig.context.set("#external", context);
    } else {
      svelteConfig.context = new Map(Object.entries(context));
    }
    return svelteConfig;
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Processes Svelte props. Potentially props can be a function to invoke with `thisArg`.
   *
   * @param props - Svelte props.
   *
   * @param thisArg - `This` reference to set for invoking any props function.
   *
   * @param config - Svelte config
   *
   * @returns Svelte props.
   */
  static #processProps(props, thisArg, config) {
    if (typeof props === "function") {
      const result = props.call(thisArg);
      if (isObject(result)) {
        return result;
      } else {
        throw new Error(`TJSSvelte.config.parseConfig - 'props' is a function that did not return an object for config:
${JSON.stringify(config)}`);
      }
    } else if (isObject(props)) {
      return props;
    } else if (props !== void 0) {
      throw new Error(`TJSSvelte.config.parseConfig - 'props' is not a function or an object for config:
${JSON.stringify(config)}`);
    }
    return {};
  }
};
Object.seal(APIConfig);
var APIUtil = class {
  constructor() {
  }
  /**
   * Provides basic duck typing to determine if the provided function is a constructor function for a Svelte
   * component.
   *
   * @param comp - Data to check as a Svelte component.
   *
   * @returns Whether basic duck typing succeeds.
   */
  static isComponent(comp) {
    if (comp === null || comp === void 0 || typeof comp !== "function") {
      return false;
    }
    const prototypeName = comp?.prototype?.constructor?.name;
    if (typeof prototypeName === "string" && (prototypeName.startsWith("Proxy<") || prototypeName === "ProxyComponent")) {
      return true;
    }
    return typeof window !== "undefined" ? typeof comp?.prototype?.$destroy === "function" && typeof comp?.prototype?.$on === "function" : (
      // client-side
      typeof comp?.prototype?.render === "function"
    );
  }
  /**
   * Provides basic duck typing to determine if the provided object is a HMR ProxyComponent instance or class.
   *
   * @param {unknown}  comp - Data to check as a HMR proxy component.
   *
   * @returns {boolean} Whether basic duck typing succeeds.
   */
  static isHMRProxy(comp) {
    const instanceName = comp?.constructor?.name;
    if (typeof instanceName === "string" && (instanceName.startsWith("Proxy<") || instanceName === "ProxyComponent")) {
      return true;
    }
    const prototypeName = comp?.prototype?.constructor?.name;
    return typeof prototypeName === "string" && (prototypeName.startsWith("Proxy<") || prototypeName === "ProxyComponent");
  }
  /**
   * Runs outro transition then destroys Svelte component.
   *
   * Workaround for https://github.com/sveltejs/svelte/issues/4056
   *
   * @param instance - A Svelte component.
   *
   * @returns Promise returned after outro transition completed and component destroyed.
   */
  static async outroAndDestroy(instance11) {
    if (instance11 === void 0 || instance11 === null) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      if (instance11?.$$?.fragment && instance11?.$$?.fragment?.o) {
        group_outros();
        transition_out(instance11.$$.fragment, 0, 0, () => {
          instance11?.$destroy?.();
          resolve();
        });
        check_outros();
      } else {
        instance11?.$destroy?.();
        resolve();
      }
    });
  }
};
Object.seal(APIUtil);
var TJSSvelte = class {
  constructor() {
  }
  static get config() {
    return APIConfig;
  }
  /**
   * @returns The utility API.
   */
  static get util() {
    return APIUtil;
  }
};
Object.seal(TJSSvelte);

// node_modules/@typhonjs-fvtt/runtime/_dist/util/semver/index.js
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (version) => {
  if (typeof version !== "string") {
    throw new TypeError("Invalid argument expected string");
  }
  const match = version.match(semver);
  if (!match) {
    throw new Error(`Invalid argument not valid semver ('${version}' received)`);
  }
  match.shift();
  return match;
};
var isWildcard = (s) => s === "*" || s === "x" || s === "X";
var tryParse = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? v : n;
};
var forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
var compareStrings = (a, b) => {
  if (isWildcard(a) || isWildcard(b))
    return 0;
  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  if (ap > bp)
    return 1;
  if (ap < bp)
    return -1;
  return 0;
};
var compareSegments = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const r = compareStrings(a[i] || "0", b[i] || "0");
    if (r !== 0)
      return r;
  }
  return 0;
};
var compareVersions = (v1, v2) => {
  const n1 = validateAndParse(v1);
  const n2 = validateAndParse(v2);
  const p1 = n1.pop();
  const p2 = n2.pop();
  const r = compareSegments(n1, n2);
  if (r !== 0)
    return r;
  if (p1 && p2) {
    return compareSegments(p1.split("."), p2.split("."));
  } else if (p1 || p2) {
    return p1 ? -1 : 1;
  }
  return 0;
};
var compare = (v1, v2, operator) => {
  assertValidOperator(operator);
  const res = compareVersions(v1, v2);
  return operatorResMap[operator].includes(res);
};
var operatorResMap = {
  ">": [1],
  ">=": [0, 1],
  "=": [0],
  "<=": [-1, 0],
  "<": [-1],
  "!=": [-1, 1]
};
var allowedOperators = Object.keys(operatorResMap);
var assertValidOperator = (op) => {
  if (typeof op !== "string") {
    throw new TypeError(`Invalid operator type, expected string but got ${typeof op}`);
  }
  if (allowedOperators.indexOf(op) === -1) {
    throw new Error(`Invalid operator, expected one of ${allowedOperators.join("|")}`);
  }
};
var satisfies = (version, range) => {
  range = range.replace(/([><=]+)\s+/g, "$1");
  if (range.includes("||")) {
    return range.split("||").some((r4) => satisfies(version, r4));
  } else if (range.includes(" - ")) {
    const [a, b] = range.split(" - ", 2);
    return satisfies(version, `>=${a} <=${b}`);
  } else if (range.includes(" ")) {
    return range.trim().replace(/\s{2,}/g, " ").split(" ").every((r4) => satisfies(version, r4));
  }
  const m = range.match(/^([<>=~^]+)/);
  const op = m ? m[1] : "=";
  if (op !== "^" && op !== "~")
    return compare(version, range, op);
  const [v1, v2, v3, , vp] = validateAndParse(version);
  const [r1, r2, r3, , rp] = validateAndParse(range);
  const v = [v1, v2, v3];
  const r = [r1, r2 !== null && r2 !== void 0 ? r2 : "x", r3 !== null && r3 !== void 0 ? r3 : "x"];
  if (rp) {
    if (!vp)
      return false;
    if (compareSegments(v, r) !== 0)
      return false;
    if (compareSegments(vp.split("."), rp.split(".")) === -1)
      return false;
  }
  const nonZero = r.findIndex((v4) => v4 !== "0") + 1;
  const i = op === "~" ? 2 : nonZero > 1 ? nonZero : 1;
  if (compareSegments(v.slice(0, i), r.slice(0, i)) !== 0)
    return false;
  if (compareSegments(v.slice(i), r.slice(i)) === -1)
    return false;
  return true;
};
var validateStrict = (version) => typeof version === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(version);

// node_modules/@typhonjs-fvtt/runtime/_dist/util/dom/style/index.js
var StyleParse = class {
  static #regexPixels = /(\d+)\s*px/;
  /**
   * @private
   */
  constructor() {
    throw new Error("StyleParse constructor: This is a static class and should not be constructed.");
  }
  /**
   * Parse a CSS declaration block / {@link CSSDeclarationBlock} (IE `color: red; font-size: 14px;`) into an object of
   * property / value pairs.
   *
   * This implementation is optimized for parsing the output of `CSSStyleRule.style.cssText`, which is always
   * well-formed according to the CSSOM spec. It is designed to be:
   * ```
   * - **Fast**: minimal allocations, no regex in the hot loop.
   * - **Accurate**: ignores `;` inside quotes or parentheses.
   * - **Flexible**: supports optional camel case conversion.
   * - **CSS variable safe**: leaves `--*` properties untouched.
   *```
   *
   * @param cssText - A valid CSS declaration block (no selectors).
   *
   * @param [options] - Optional parser settings.
   *
   * @param [options.camelCase=false] - Convert hyphen-case property names to camel case.
   *
   * @returns An object mapping property names to their CSS values.
   */
  static cssText(cssText, { camelCase = false } = {}) {
    if (typeof cssText !== "string" || cssText.length === 0) {
      return {};
    }
    if (cssText.indexOf(":") === -1) {
      return {};
    }
    const out = {};
    let segStart = 0;
    let parens = 0;
    let inSQ = false;
    let inDQ = false;
    for (let i = 0; i < cssText.length; i++) {
      const ch = cssText[i];
      if (ch === '"' && !inSQ) {
        inDQ = !inDQ;
      } else if (ch === "'" && !inDQ) {
        inSQ = !inSQ;
      } else if (!inSQ && !inDQ) {
        if (ch === "(") {
          parens++;
        } else if (ch === ")") {
          if (parens > 0) {
            parens--;
          }
        } else if (ch === ";" && parens === 0) {
          if (i > segStart) {
            const chunk = cssText.slice(segStart, i).trim();
            if (chunk) {
              this.#cssTextFlushDecl(chunk, out, camelCase);
            }
          }
          segStart = i + 1;
        }
      }
    }
    if (segStart < cssText.length) {
      const chunk = cssText.slice(segStart).trim();
      if (chunk) {
        this.#cssTextFlushDecl(chunk, out, camelCase);
      }
    }
    return out;
  }
  /**
   * Parses a pixel string / computed styles. Ex. `100px` returns `100`.
   *
   * @param   value - Value to parse.
   *
   * @returns The integer component of a pixel string.
   */
  static pixels(value) {
    if (typeof value !== "string") {
      return void 0;
    }
    const isPixels = this.#regexPixels.test(value);
    const number = parseInt(value);
    return isPixels && Number.isFinite(number) ? number : void 0;
  }
  /**
   * Returns the pixel value for `1rem` based on the root document element. You may apply an optional multiplier.
   *
   * @param [multiplier=1] - Optional multiplier to apply to `rem` pixel value; default: 1.
   *
   * @param [options] - Optional parameters.
   *
   * @param [options.targetDocument=document] The target DOM {@link Document} if different from the main
   *        browser global `document`.
   *
   * @returns The pixel value for `1rem` with or without a multiplier based on the root document element.
   */
  static remPixels(multiplier = 1, { targetDocument = window.document } = {}) {
    return targetDocument?.documentElement ? multiplier * parseFloat(window.getComputedStyle(targetDocument.documentElement).fontSize) : void 0;
  }
  /**
   * Split a CSS selector list into individual selectors, honoring commas that appear only at the top level
   * (IE not inside (), [], or quotes). Additional options provide inclusion / exclusion filtering of selector parts.
   *
   * Examples:
   *   '.a, .b'                                  → ['.a', '.b']
   *   ':is(.a, .b):not([data-x=","]) .c, .d'    → [':is(.a, .b):not([data-x=","]) .c', '.d']
   *
   * @param selectorText - `CSSStyleRule.selectorText` to parse.
   *
   * @param [options] - Optional filtering options.
   *
   * @param [options.excludeSelectorParts] - An array of RegExp instances to filter by exclusion.
   *
   * @param [options.includeSelectorPartSet] - A Set of strings to filter by inclusion.
   *
   * @returns Array of trimmed selector strings w/ optional filtering of parts.
   */
  static selectorText(selectorText, { excludeSelectorParts, includeSelectorPartSet } = {}) {
    const parts = [];
    if (typeof selectorText !== "string" || selectorText.length === 0) {
      return parts;
    }
    const hasExclude = Array.isArray(excludeSelectorParts) && excludeSelectorParts.length > 0;
    const hasInclude = CrossWindow.isSet(includeSelectorPartSet) && includeSelectorPartSet.size > 0;
    let start = 0;
    let inSQ = false;
    let inDQ = false;
    let paren = 0;
    let bracket = 0;
    for (let i = 0; i < selectorText.length; i++) {
      const ch = selectorText[i];
      if (ch === '"' && !inSQ) {
        inDQ = !inDQ;
        continue;
      }
      if (ch === "'" && !inDQ) {
        inSQ = !inSQ;
        continue;
      }
      if (inSQ || inDQ) {
        continue;
      }
      if (ch === "(") {
        paren++;
        continue;
      }
      if (ch === ")") {
        if (paren > 0) {
          paren--;
        }
        continue;
      }
      if (ch === "[") {
        bracket++;
        continue;
      }
      if (ch === "]") {
        if (bracket > 0) {
          bracket--;
        }
        continue;
      }
      if (ch === "," && paren === 0 && bracket === 0) {
        const piece = selectorText.slice(start, i).trim();
        if (piece && (!hasInclude || includeSelectorPartSet.has(piece)) && (!hasExclude || !excludeSelectorParts.some((rx) => rx.test(piece)))) {
          parts.push(piece);
        }
        start = i + 1;
      }
    }
    const last = selectorText.slice(start).trim();
    if (last && (!hasInclude || includeSelectorPartSet.has(last)) && (!hasExclude || !excludeSelectorParts.some((rx) => rx.test(last)))) {
      parts.push(last);
    }
    return parts;
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Parse a single CSS declaration string into a property / value pair and store it in the output object.
   *
   * Note: Used by {@link StyleParse.cssText}.
   *
   * This method:
   * ```
   * - Splits on the first `:` into property and value parts
   * - Trims whitespace from both
   * - Optionally converts hyphen-case to camelCase
   * - Ignores empty or malformed declarations
   * ```
   *
   * @param chunk - The raw CSS declaration string (IE `"color: red"`).
   *
   * @param out - The object to store the parsed property / value pair.
   *
   * @param camelCase - Whether to convert hyphen-case keys to camel case.
   */
  static #cssTextFlushDecl(chunk, out, camelCase) {
    const idx = chunk.indexOf(":");
    if (idx < 0) {
      return;
    }
    let key = chunk.slice(0, idx).trim();
    if (!key) {
      return;
    }
    const value = chunk.slice(idx + 1).trim();
    if (camelCase && !key.startsWith("--")) {
      let s = "";
      for (let i = 0; i < key.length; i++) {
        const code = key.charCodeAt(i);
        if (code === 45 && i + 1 < key.length) {
          i++;
          s += key[i].toUpperCase();
        } else {
          s += key[i];
        }
      }
      key = s;
    }
    out[key] = value;
  }
};
var RuleManager = class {
  /**
   * The specific rule instance in the association HTMLStyleElement.
   */
  #cssRule;
  /**
   * The CSS selector for this rule manager.
   */
  #selector;
  /**
   * The name that this rule manager is indexed by in the associated `StyleManager` instance.
   */
  #name;
  /**
   * @param   cssRule -
   *
   * @param   name -
   *
   * @param   selector -
   */
  constructor(cssRule, name, selector) {
    if (!CrossWindow.isCSSStyleRule(cssRule)) {
      throw new TypeError(`RuleManager error: 'cssRule' is not a CSSStyleRule instance..`);
    }
    if (typeof name !== "string") {
      throw new TypeError(`RuleManager error: 'name' is not a string.`);
    }
    if (typeof selector !== "string") {
      throw new TypeError(`RuleManager error: 'selector' is not a string.`);
    }
    this.#cssRule = cssRule;
    this.#name = name;
    this.#selector = selector;
  }
  // Accessors ------------------------------------------------------------------------------------------------------
  /**
   * @returns Provides an accessor to get the `cssText` for the style rule or undefined if not connected.
   */
  get cssText() {
    return this.isConnected ? this.#cssRule.style.cssText : void 0;
  }
  /**
   * Determines if this RuleManager is still connected / available.
   *
   * @returns Is RuleManager connected.
   */
  get isConnected() {
    const sheet = this.#cssRule?.parentStyleSheet;
    const owner = sheet?.ownerNode;
    return !!(sheet && owner && owner.isConnected);
  }
  /**
   * @returns Name of this RuleManager indexed by associated StyleManager.
   */
  get name() {
    return this.#name;
  }
  /**
   * @returns The associated selector for this CSS rule.
   */
  get selector() {
    return this.#selector;
  }
  /**
   * @param   cssText - Provides an accessor to set the `cssText` for the style rule.
   */
  set cssText(cssText) {
    if (!this.isConnected) {
      return;
    }
    this.#cssRule.style.cssText = typeof cssText === "string" ? cssText : "";
  }
  // Iterator -------------------------------------------------------------------------------------------------------
  /**
   * Allows usage in `for of` loops directly.
   *
   * @returns Entries Map iterator.
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  // Methods --------------------------------------------------------------------------------------------------------
  /**
   * @returns Iterator of CSS property entries in hyphen-case.
   */
  entries() {
    return Object.entries(this.get() ?? {})[Symbol.iterator]();
  }
  /**
   * Retrieves an object with the current CSS rule data.
   *
   * @param [options] - Optional settings.
   *
   * @param [options.camelCase=false] - Whether to convert property names to camel case.
   *
   * @returns Current CSS style data or undefined if not connected.
   */
  get(options = {}) {
    return this.isConnected ? StyleParse.cssText(this.#cssRule.style.cssText, options) : void 0;
  }
  /**
   * Gets a particular CSS property value.
   *
   * @param key - CSS property key; must be in hyphen-case (IE `background-color`).
   *
   * @returns Returns CSS property value or undefined if non-existent.
   */
  getProperty(key) {
    if (!this.isConnected) {
      return void 0;
    }
    if (typeof key !== "string") {
      throw new TypeError(`RuleManager error: 'key' is not a string.`);
    }
    const result = this.#cssRule.style.getPropertyValue(key);
    return result !== "" ? result : void 0;
  }
  /**
   * Returns whether this CSS rule manager has a given property key.
   *
   * @param key - CSS property key; must be in hyphen-case (IE `background-color`).
   *
   * @returns Property key exists / is defined.
   */
  hasProperty(key) {
    if (!this.isConnected) {
      return false;
    }
    if (typeof key !== "string") {
      throw new TypeError(`RuleManager error: 'key' is not a string.`);
    }
    return this.#cssRule.style.getPropertyValue(key) !== "";
  }
  /**
   * @returns Iterator of CSS property keys in hyphen-case.
   */
  keys() {
    return Object.keys(this.get() ?? {})[Symbol.iterator]();
  }
  /**
   * Set CSS properties in bulk by property / value. Must use hyphen-case.
   *
   * @param styles - CSS styles object.
   *
   * @param [options] - Options.
   *
   * @param [override=true] - When true overrides any existing values; default: `true`.
   */
  setProperties(styles, { override = true } = {}) {
    if (!this.isConnected) {
      return;
    }
    if (!isObject(styles)) {
      throw new TypeError(`RuleManager error: 'styles' is not an object.`);
    }
    if (typeof override !== "boolean") {
      throw new TypeError(`RuleManager error: 'override' is not a boolean.`);
    }
    if (override) {
      for (const [key, value] of Object.entries(styles)) {
        this.#cssRule.style.setProperty(key, value);
      }
    } else {
      for (const [key, value] of Object.entries(styles)) {
        if (this.#cssRule.style.getPropertyValue(key) === "") {
          this.#cssRule.style.setProperty(key, value);
        }
      }
    }
  }
  /**
   * Sets a particular property.
   *
   * @param key - CSS property key; must be in hyphen-case (IE `background-color`).
   *
   * @param value - CSS property value.
   *
   * @param [options] - Options.
   *
   * @param [options.override=true] - When true overrides any existing value; default: `true`.
   */
  setProperty(key, value, { override = true } = {}) {
    if (!this.isConnected) {
      return;
    }
    if (typeof key !== "string") {
      throw new TypeError(`RuleManager error: 'key' is not a string.`);
    }
    if (typeof value !== "string") {
      throw new TypeError(`RuleManager error: 'value' is not a string.`);
    }
    if (typeof override !== "boolean") {
      throw new TypeError(`RuleManager error: 'override' is not a boolean.`);
    }
    if (override) {
      this.#cssRule.style.setProperty(key, value);
    } else {
      if (this.#cssRule.style.getPropertyValue(key) === "") {
        this.#cssRule.style.setProperty(key, value);
      }
    }
  }
  /**
   * Removes the property keys specified. If `keys` is an iterable list then all property keys in the list are
   * removed. The keys must be in hyphen-case (IE `background-color`).
   *
   * @param keys - The property keys to remove.
   */
  removeProperties(keys) {
    if (!this.isConnected) {
      return;
    }
    if (!isIterable(keys)) {
      throw new TypeError(`RuleManager error: 'keys' is not an iterable list.`);
    }
    for (const key of keys) {
      if (typeof key === "string") {
        this.#cssRule.style.removeProperty(key);
      }
    }
  }
  /**
   * Removes a particular CSS property.
   *
   * @param key - CSS property key; must be in hyphen-case (IE `background-color`).
   *
   * @returns CSS value when removed or undefined if non-existent.
   */
  removeProperty(key) {
    if (!this.isConnected) {
      return void 0;
    }
    if (typeof key !== "string") {
      throw new TypeError(`RuleManager error: 'key' is not a string.`);
    }
    const result = this.#cssRule.style.removeProperty(key);
    return result !== "" ? result : void 0;
  }
};
var StyleManager = class _StyleManager {
  /**
   * Provides a token allowing internal instance construction.
   */
  static #CTOR_TOKEN = Symbol("StyleManager.CTOR_TOKEN");
  /**
   * Stores configured RuleManager instance by name.
   */
  #cssRuleMap;
  /**
   * CSS ID associated with style element.
   */
  #id;
  /**
   * Any associated CSS layer name.
   */
  #layerName;
  /**
   * The target style element.
   */
  #styleElement;
  /**
   * The version of this style manager.
   */
  #version;
  /**
   * @private
   */
  constructor({ cssRuleMap, id, styleElement, version, layerName, token }) {
    if (token !== _StyleManager.#CTOR_TOKEN) {
      throw new Error("StyleManager constructor: Please use the static `create` or `connect` methods.");
    }
    this.#cssRuleMap = cssRuleMap;
    this.#id = id;
    this.#layerName = layerName;
    this.#styleElement = styleElement;
    this.#version = version;
  }
  // Static Methods -------------------------------------------------------------------------------------------------
  /**
   * Connect to an existing dynamic styles managed element by CSS ID with semver check on version range compatibility.
   *
   * @param   options - Options.
   */
  static connect({ id, range, document: document2 = window.document, warn = false }) {
    if (typeof id !== "string") {
      throw new TypeError(`'id' is not a string.`);
    }
    if (typeof range !== "string") {
      throw new TypeError(`'range' is not a string.`);
    }
    if (!CrossWindow.isDocument(document2)) {
      throw new TypeError(`'document' is not an instance of HTMLDocument.`);
    }
    return this.#initializeConnect(document2, id, range, warn);
  }
  /**
   * @param   options - Options.
   *
   * @returns Created style manager instance or undefined if already exists with a higher version.
   */
  static create(options) {
    return this.#createImpl(options);
  }
  /**
   * Query and check for an existing dynamic style manager element / instance given a CSS ID.
   *
   * @param   options - Options.
   *
   * @returns Undefined if no style manager is configured for the given CSS ID otherwise an object containing the
   *          current version and HTMLStyleElement associated with the CSS ID.
   */
  static exists({ id, document: document2 = window.document }) {
    if (typeof id !== "string") {
      throw new TypeError(`'id' is not a string.`);
    }
    if (!CrossWindow.isDocument(document2)) {
      throw new TypeError(`'document' is not an instance of HTMLDocument.`);
    }
    const existingStyleEl = document2.querySelector(`head style#${id}`);
    if (existingStyleEl) {
      const existingVersion = existingStyleEl.getAttribute("data-version") ?? "";
      if (validateStrict(existingVersion)) {
        return {
          id,
          version: existingVersion,
          element: existingStyleEl
        };
      }
    }
    return void 0;
  }
  // Accessors ------------------------------------------------------------------------------------------------------
  /**
   * Determines if this StyleManager style element is still connected / available.
   *
   * @returns Is StyleManager connected.
   */
  get isConnected() {
    return !!this.#styleElement?.isConnected;
  }
  /**
   * @returns Provides an accessor to get the `textContent` for the style sheet.
   */
  get textContent() {
    return this.#styleElement?.textContent;
  }
  /**
   * @returns Returns the version of this instance.
   */
  get version() {
    return this.#version;
  }
  // Iterator -------------------------------------------------------------------------------------------------------
  /**
   * Allows usage in `for of` loops directly.
   *
   * @returns Entries Map iterator.
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  // Methods --------------------------------------------------------------------------------------------------------
  /**
   * Provides a copy constructor to duplicate an existing StyleManager instance into a new document.
   *
   * @param   options - Required clone options.
   *
   * @returns New style manager instance or undefined if not connected.
   */
  clone({ document: document2, force = false, warn = false }) {
    if (!this.isConnected) {
      _StyleManager.#log(warn, "clone", `This style manager instance is not connected for id: ${this.#id}`);
      return void 0;
    }
    if (!CrossWindow.isDocument(document2)) {
      throw new TypeError(`'document' is not an instance of HTMLDocument.`);
    }
    const rules = {};
    for (const key of this.#cssRuleMap.keys()) {
      const selector = this.#cssRuleMap.get(key)?.selector;
      if (selector) {
        rules[key] = selector;
      }
    }
    const newStyleManager = _StyleManager.#createImpl({
      id: this.#id,
      version: this.#version,
      layerName: this.#layerName,
      rules,
      document: document2,
      force,
      warn
    });
    if (newStyleManager) {
      for (const key of this.#cssRuleMap.keys()) {
        if (newStyleManager.#cssRuleMap.has(key)) {
          const value = this.#cssRuleMap.get(key)?.cssText;
          const targetRuleManager = newStyleManager.#cssRuleMap.get(key);
          if (value && targetRuleManager) {
            targetRuleManager.cssText = value;
          }
        }
      }
      return newStyleManager;
    }
    return void 0;
  }
  /**
   * @returns RuleManager entries iterator.
   */
  entries() {
    return this.#cssRuleMap.entries();
  }
  /**
   * Retrieves an associated {@link RuleManager} by name.
   *
   * @param   ruleName - Rule name.
   *
   * @returns Associated rule manager for given name or undefined if the rule name is not defined or manager is
   *          unconnected.
   */
  get(ruleName) {
    if (!this.isConnected) {
      return;
    }
    return this.#cssRuleMap.get(ruleName);
  }
  /**
   * Returns whether a {@link StyleManager.CSSRuleManger} exists for the given name.
   *
   * @param ruleName - Rule name.
   *
   * @returns Is there a CSS rule manager with the given name.
   */
  has(ruleName) {
    return this.#cssRuleMap.has(ruleName);
  }
  /**
   * @returns {MapIterator<string>} RuleManager keys iterator.
   */
  keys() {
    return this.#cssRuleMap.keys();
  }
  /**
   * @returns Iterator of all RuleManager instances.
   */
  values() {
    return this.#cssRuleMap.values();
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Internal `create` implementation with additional `force` option to override any version check.
   *
   * @param   options - Options.
   *
   * @returns Created style manager instance or undefined if already exists with a higher version.
   */
  static #createImpl({ id, rules, version, layerName, document: document2 = window.document, force = false, warn = false }) {
    if (typeof id !== "string") {
      throw new TypeError(`'id' is not a string.`);
    }
    if (!isObject(rules)) {
      throw new TypeError(`'rules' is not an object.`);
    }
    if (!CrossWindow.isDocument(document2)) {
      throw new TypeError(`'document' is not an instance of HTMLDocument.`);
    }
    if (!validateStrict(version)) {
      throw new TypeError(`'version' is not a valid semver string.`);
    }
    if (typeof force !== "boolean") {
      throw new TypeError(`'force' is not a boolean.`);
    }
    if (typeof warn !== "boolean") {
      throw new TypeError(`'warn' is not a boolean.`);
    }
    if (layerName !== void 0 && typeof layerName !== "string") {
      throw new TypeError(`'layerName' is not a string.`);
    }
    const current = this.exists({ id, document: document2 });
    if (isObject(current)) {
      if (force || compare(version, current.version, ">")) {
        current.element?.remove?.();
        return this.#initializeCreate(document2, id, rules, version, layerName);
      } else {
        this.#log(warn, "create", `Could not create instance as one already exists with a higher version for ID: ${id}.`);
        return void 0;
      }
    } else {
      return this.#initializeCreate(document2, id, rules, version, layerName);
    }
  }
  /**
   * @param document - Target Document.
   *
   * @param id - Associated CSS ID
   *
   * @param range - SemVer version or version range.
   *
   * @param warn - When true, log warnings.
   *
   * @returns Style manager connected to existing element / style rules or undefined if no connection possible.
   */
  static #initializeConnect(document2, id, range, warn = false) {
    const styleElement = document2.querySelector(`head style#${id}`);
    if (!styleElement || styleElement?.sheet === null) {
      this.#log(warn, "connect", `Could not find existing style element for id: ${id}`);
      return void 0;
    }
    const existingRules = styleElement._tjsRules;
    const existingVersion = styleElement._tjsVersion;
    const existingLayerName = styleElement._tjsLayerName;
    let targetSheet = styleElement.sheet;
    if (!isObject(existingRules)) {
      this.#log(warn, "connect", `Could not find rules configuration on existing style element for id: ${id}`);
      return void 0;
    }
    if (!validateStrict(existingVersion)) {
      this.#log(warn, "connect", `Could not find version on existing style element for id: ${id}`);
      return void 0;
    }
    if (existingLayerName !== void 0 && typeof existingLayerName !== "string") {
      this.#log(warn, "connect", `Could not find layer name on existing style element for id: ${id}`);
      return void 0;
    }
    if (!satisfies(existingVersion, range)) {
      this.#log(warn, "connect", `Requested range (${range}) does not satisfy existing version: ${existingVersion}`);
      return void 0;
    }
    if (!CrossWindow.isCSSStyleSheet(targetSheet)) {
      return void 0;
    }
    const cssRuleMap = /* @__PURE__ */ new Map();
    const reverseRuleMap = new Map(Object.entries(existingRules).map(([key, value]) => [value, key]));
    try {
      if (typeof existingLayerName) {
        let foundLayer = false;
        for (const rule of Array.from(targetSheet.cssRules)) {
          if (CrossWindow.isCSSLayerBlockRule(rule) && rule.name === existingLayerName) {
            targetSheet = rule;
            foundLayer = true;
          }
        }
        if (!foundLayer) {
          this.#log(warn, "connect", `Could not find CSSLayerBlockRule for existing layer name: ${existingLayerName}`);
          return void 0;
        }
      }
      for (const cssRule of Array.from(targetSheet.cssRules)) {
        if (!CrossWindow.isCSSStyleRule(cssRule)) {
          continue;
        }
        const selector = cssRule?.selectorText;
        if (reverseRuleMap.has(selector)) {
          const ruleName = reverseRuleMap.get(selector);
          cssRuleMap.set(ruleName, new RuleManager(cssRule, ruleName, selector));
          reverseRuleMap.delete(selector);
        }
      }
      if (reverseRuleMap.size > 0) {
        this.#log(warn, "connect", `Could not find CSSStyleRules for these rule configurations: ${JSON.stringify([...reverseRuleMap])}`);
        return void 0;
      }
      return new _StyleManager({
        cssRuleMap,
        id,
        version: existingVersion,
        layerName: existingLayerName,
        styleElement,
        token: _StyleManager.#CTOR_TOKEN
      });
    } catch (error) {
      console.error(`TyphonJS Runtime [StyleManager error]: Please update your browser to the latest version.`, error);
    }
    return void 0;
  }
  /**
   * @param document - Target Document.
   *
   * @param id - Associated CSS ID
   *
   * @param rules -
   *
   * @param version -
   *
   * @param layerName -
   *
   * @returns New StyleManager instance.
   */
  static #initializeCreate(document2, id, rules, version, layerName) {
    const styleElement = document2.createElement("style");
    styleElement.id = id;
    styleElement.setAttribute("data-version", String(version));
    styleElement._tjsRules = rules;
    styleElement._tjsVersion = version;
    styleElement._tjsLayerName = layerName;
    document2.head.append(styleElement);
    let targetSheet;
    if (styleElement.sheet === null) {
      return void 0;
    }
    const cssRuleMap = /* @__PURE__ */ new Map();
    try {
      if (layerName) {
        const index = styleElement.sheet.insertRule(`@layer ${layerName} {}`);
        targetSheet = styleElement.sheet.cssRules[index];
      } else {
        targetSheet = styleElement.sheet;
      }
      if (rules) {
        for (const ruleName in rules) {
          const selector = rules[ruleName];
          const index = targetSheet.insertRule(`${selector} {}`);
          const cssRule = targetSheet.cssRules[index];
          cssRuleMap.set(ruleName, new RuleManager(cssRule, ruleName, selector));
        }
      }
      return new _StyleManager({
        cssRuleMap,
        id,
        version,
        layerName,
        styleElement,
        token: _StyleManager.#CTOR_TOKEN
      });
    } catch (error) {
      console.error(`TyphonJS Runtime [StyleManager error]: Please update your browser to the latest version.`, error);
      if (styleElement && styleElement.parentNode) {
        styleElement.remove();
      }
    }
    return void 0;
  }
  /**
   * @param   warn - When true, log warnings.
   *
   * @param   path - Particular interaction path for warning.
   *
   * @param   message - Message to log.
   */
  static #log(warn, path, message) {
    if (warn) {
      console.warn(`[TRL StyleManager] ${path} warning: ${message}`);
    }
  }
};
var _a;
var _b;
var StyleSheetResolve = class {
  /**
   * Detects hyphen-case separator for camel case property key conversion.
   */
  static #HYPHEN_CASE_REGEX = /-([a-z])/g;
  /**
   * Detects just a single `(prefers-*)` CSSMediaRule condition.
   */
  static #MEDIA_RULE_PREFERS = /^\s*\(?\s*prefers-[^)]+(?:\s*:\s*[^)]+)?\)?\s*$/i;
  /**
   * Detects relative `url()` references in CSSStyleRule `cssText`.
   */
  static #URL_DETECTION_REGEX = /\burl\(\s*(['"]?)(?!data:|https?:|\/|#)/i;
  /**
   * Captures contents of `url()` references.
   */
  static #URL_REGEX = /url\((['"]?)([^'")]+)\1\)/g;
  /**
   * Internal tracking of frozen state; once frozen, no more modifications are possible.
   */
  #frozen = false;
  /**
   * Parsed selector to associated style properties.
   */
  #sheetMap = /* @__PURE__ */ new Map();
  /**
   * Parse a CSSStyleSheet instance with the given options or accept a pre-filled Map generating a new
   * `StyleSheetResolve` instance.
   *
   * @param styleSheetOrMap - The stylesheet instance to parse or an existing parsed stylesheet Map.
   *
   * @param [options] - Options for parsing stylesheet.
   *
   * @returns {StyleSheetResolve} New instance with the given parsed data.
   */
  static parse(styleSheetOrMap, options = {}) {
    return new _a().parse(styleSheetOrMap, options);
  }
  /**
   * Instantiate an empty `StyleSheetResolve` instance.
   */
  constructor() {
  }
  // Accessors ------------------------------------------------------------------------------------------------------
  /**
   * @returns Current frozen state; when true no more modifications are possible.
   */
  get frozen() {
    return this.#frozen;
  }
  /**
   * @returns Returns the size / count of selector properties tracked.
   */
  get size() {
    return this.#sheetMap.size;
  }
  // Iterator -------------------------------------------------------------------------------------------------------
  /**
   * Allows usage in `for of` loops directly.
   *
   * @returns Entries Map iterator.
   */
  *[Symbol.iterator]() {
    yield* this.entries();
  }
  // Methods --------------------------------------------------------------------------------------------------------
  /**
   * Clears any existing parsed styles.
   */
  clear() {
    if (this.#frozen) {
      throw new Error("Cannot modify a frozen StyleSheetResolve instance.");
    }
    this.#sheetMap.clear();
  }
  /**
   * Clones this instance returning a new `StyleSheetResolve` instance with a copy of the data.
   *
   * @returns Cloned instance.
   */
  clone() {
    return _a.parse(this.#clone(this.#sheetMap));
  }
  /**
   * Deletes an entry in the parsed stylesheet Map.
   *
   * @param   selector - Selector key to delete.
   *
   * @returns Success state.
   */
  delete(selector) {
    if (this.#frozen) {
      throw new Error("Cannot modify a frozen StyleSheetResolve instance.");
    }
    return this.#sheetMap.delete(selector);
  }
  /**
   * Entries iterator of selector / style properties objects.
   *
   * @returns {MapIterator<[string, { [key: string]: string }]>} Tracked CSS selector key / value iterator.
   * @yields
   */
  *entries() {
    for (const key of this.#sheetMap.keys()) {
      yield [key, { ...this.#sheetMap.get(key) }];
    }
  }
  /**
   * Freezes this instance disallowing further modifications to the stylesheet data.
   */
  freeze() {
    if (this.#frozen) {
      return;
    }
    this.#frozen = true;
    for (const props of this.#sheetMap.values()) {
      Object.freeze(props);
    }
    Object.freeze(this.#sheetMap);
  }
  /**
   * Gets all properties associated with the given selector(s). You may combine multiple selectors for a
   * combined result. You may also provide additional selectors as the `resolve` option to substitute any CSS variables
   * in the target selector(s).
   *
   * @param selector - A selector or list of selectors to retrieve.
   *
   * @param [options] - Options.
   *
   * @returns Style properties object or undefined.
   */
  get(selector, { camelCase = false, depth, resolve, warnCycles = false, warnResolve = false } = {}) {
    if (typeof selector !== "string" && !isIterable(selector)) {
      throw new TypeError(`'selector' must be a string or an iterable list of strings.`);
    }
    if (typeof camelCase !== "boolean") {
      throw new TypeError(`'camelCase' must be a boolean.`);
    }
    if (depth !== void 0 && (!Number.isInteger(depth) || depth < 1)) {
      throw new TypeError(`'depth' must be a positive integer >= 1.`);
    }
    if (resolve !== void 0 && typeof resolve !== "string" && !isIterable(resolve)) {
      throw new TypeError(`'resolve' must be a string or an iterable list of strings.`);
    }
    if (typeof warnCycles !== "boolean") {
      throw new TypeError(`'warnCycles' must be a boolean.`);
    }
    if (typeof warnResolve !== "boolean") {
      throw new TypeError(`'warnResolve' must be a boolean.`);
    }
    let result = void 0;
    if (isIterable(selector)) {
      for (const entry of selector) {
        if (this.#sheetMap.has(entry)) {
          result = Object.assign(result ?? {}, this.#sheetMap.get(entry));
        }
      }
    } else {
      if (this.#sheetMap.has(selector)) {
        result = Object.assign(result ?? {}, this.#sheetMap.get(selector));
      }
    }
    if (result && (typeof resolve === "string" || isIterable(resolve))) {
      const resolveList = typeof resolve === "string" ? [resolve] : Array.from(resolve);
      depth = typeof depth === "number" ? depth : Math.max(1, resolveList.length);
      const resolveData = {
        parentNotFound: /* @__PURE__ */ new Set(),
        seenCycles: /* @__PURE__ */ new Set(),
        warnCycles
      };
      for (let cntr = 0; cntr < depth && cntr < resolveList.length; cntr++) {
        this.#resolve(result, resolveList, resolveData);
      }
      if (resolveData.parentNotFound.size > 0) {
        console.warn(`[TyphonJS Runtime] StyleSheetResolve - resolve - Could not locate parent selector(s) for resolution: '${[...resolveData.parentNotFound].join(", ")}'`);
      }
    }
    if (result && camelCase) {
      const remapped = {};
      const toUpper = (_, str) => str.toUpperCase();
      for (const key in result) {
        const mappedKey = key.startsWith("--") ? key : key.replace(_a.#HYPHEN_CASE_REGEX, toUpper);
        remapped[mappedKey] = result[key];
      }
      result = remapped;
    }
    return result;
  }
  /**
   * Gets a specific property value from the given `selector` and `property` key.
   *
   * @param   selector - A selector or list of selectors to retrieve.
   *
   * @param   property - Specific property to locate.
   *
   * @param   [options] - Options.
   *
   * @returns Style property value.
   */
  getProperty(selector, property, options) {
    const data = this.get(selector, options);
    return isObject(data) && property in data ? data[property] : void 0;
  }
  /**
   * Test if `StyleSheetResolve` tracks the given selector.
   *
   * @param   selector - CSS selector to check.
   *
   * @returns StyleSheetResolve tracks the given selector.
   */
  has(selector) {
    return this.#sheetMap.has(selector);
  }
  /**
   * @returns Tracked CSS selector keys iterator.
   */
  keys() {
    return this.#sheetMap.keys();
  }
  /**
   * Merges selectors and style properties from another StyleSheetResolve instance into this one. By default, the
   * source of the merge overrides existing properties. You may choose to preserve existing values along with
   * specifying exact selector matches.
   *
   * @param   source - Another instance to merge from.
   *
   * @param   [options] - Options.
   *
   * @returns This instance.
   */
  merge(source, { exactMatch = false, strategy = "override" } = {}) {
    if (this.#frozen) {
      throw new Error("Cannot modify a frozen StyleSheetResolve instance.");
    }
    if (!(source instanceof _a)) {
      throw new TypeError(`'source' is not a StyleSheetResolve instance.`);
    }
    for (const selectorPart of source.keys()) {
      if (exactMatch && !this.#sheetMap.has(selectorPart)) {
        continue;
      }
      const incoming = source.#sheetMap.get(selectorPart);
      if (!incoming) {
        continue;
      }
      const current = this.#sheetMap.get(selectorPart) ?? {};
      const merged = strategy === "preserve" ? Object.assign({}, { ...incoming }, current) : Object.assign({}, current, incoming);
      this.#sheetMap.set(selectorPart, merged);
    }
    return this;
  }
  /**
   * Clears existing stylesheet mapping and parses the given stylesheet or Map.
   *
   * @param   styleSheetOrMap - The stylesheet element to parse or an existing parsed stylesheet Map.
   *
   * @param   [options] - Options for parsing stylesheet.
   *
   * @returns This instance.
   */
  parse(styleSheetOrMap, options = {}) {
    if (this.#frozen) {
      throw new Error("Cannot modify a frozen StyleSheetResolve instance.");
    }
    this.#sheetMap.clear();
    if (!CrossWindow.isCSSStyleSheet(styleSheetOrMap) && !CrossWindow.isMap(styleSheetOrMap)) {
      throw new TypeError(`'styleSheetOrMap' must be a 'CSSStyleSheet' instance or a parsed Map of stylesheet entries.`);
    }
    if (!isObject(options)) {
      throw new TypeError(`'options' is not an object.`);
    }
    if (options.baseHref !== void 0 && typeof options.baseHref !== "string") {
      throw new TypeError(`'baseHref' must be a string.`);
    }
    if (options.excludeSelectorParts !== void 0 && !isIterable(options.excludeSelectorParts)) {
      throw new TypeError(`'excludeSelectorParts' must be a list of RegExp instances.`);
    }
    if (options.includeCSSLayers !== void 0 && !isIterable(options.includeCSSLayers)) {
      throw new TypeError(`'includeCSSLayers' must be a list of RegExp instances.`);
    }
    if (options.includeSelectorPartSet !== void 0 && !CrossWindow.isSet(options.includeSelectorPartSet)) {
      throw new TypeError(`'includeSelectorPartSet' must be a Set of strings.`);
    }
    if (options.mediaQuery !== void 0 && typeof options.mediaQuery !== "boolean") {
      throw new TypeError(`'mediaQuery' must be a boolean.`);
    }
    if (options.urlRewrite !== void 0 && typeof options.urlRewrite !== "boolean") {
      throw new TypeError(`'urlRewrite' must be a boolean.`);
    }
    if (CrossWindow.isCSSStyleSheet(styleSheetOrMap)) {
      this.#parse(styleSheetOrMap, options);
    } else if (CrossWindow.isMap(styleSheetOrMap)) {
      this.#sheetMap = this.#clone(styleSheetOrMap);
    }
    return this;
  }
  /**
   * Directly sets a selector key with the given style properties object.
   *
   * @param   selector - A single selector key to set.
   *
   * @param   styleObj - Style data object of property / value pairs.
   */
  set(selector, styleObj) {
    if (this.#frozen) {
      throw new Error("Cannot modify a frozen StyleSheetResolve instance.");
    }
    if (typeof selector !== "string") {
      throw new TypeError(`'selector' must be a string.`);
    }
    if (!isObject(styleObj)) {
      throw new TypeError(`'styleObj' must be an object.`);
    }
    this.#sheetMap.set(selector, styleObj);
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Shallow clone of source Map into target Map.
   *
   * @param   sourceMap - Source Map.
   *
   * @param   [targetMap] - Target Map.
   *
   * @returns Shallow copy cloned Map.
   */
  #clone(sourceMap, targetMap = /* @__PURE__ */ new Map()) {
    for (const [selector, props] of sourceMap.entries()) {
      targetMap.set(selector, { ...props });
    }
    return targetMap;
  }
  /**
   * Parses the given CSSStyleSheet instance.
   *
   * @param styleSheet - The stylesheet to parse.
   *
   * @param [opts] - Options for parsing stylesheet.
   */
  #parse(styleSheet, opts) {
    const options = {
      baseHref: styleSheet.href ?? opts.baseHref,
      excludeSelectorParts: isIterable(opts.excludeSelectorParts) ? Array.from(opts.excludeSelectorParts) : [],
      includeCSSLayers: isIterable(opts.includeCSSLayers) ? Array.from(opts.includeCSSLayers) : [],
      includeSelectorPartSet: CrossWindow.isSet(opts.includeSelectorPartSet) ? opts.includeSelectorPartSet : /* @__PURE__ */ new Set(),
      mediaQuery: opts.mediaQuery ?? true,
      urlRewrite: opts.urlRewrite ?? true
    };
    const rules = styleSheet.cssRules;
    const allStyleRules = [];
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      switch (rule.constructor.name) {
        case "CSSLayerBlockRule":
          this.#processLayerBlockRule(rule, void 0, allStyleRules, options);
          break;
        case "CSSMediaRule":
          this.#processMediaRule(rule, allStyleRules, options);
          break;
        case "CSSStyleRule":
          allStyleRules.push(rule);
          break;
      }
    }
    this.#processStyleRules(allStyleRules, options);
  }
  /**
   * Recursively parses / processes a CSSLayerBlockRule and encountered CSSStyleRule entries.
   *
   * @param   blockRule - The `CSSLayerBlockRule` to parse.
   *
   * @param   parentLayerName - Name of parent CSS layer.
   *
   * @param   allStyleRules - All style rules to process.
   *
   * @param   opts - Sanitized process options.
   */
  #processLayerBlockRule(blockRule, parentLayerName, allStyleRules, opts) {
    const fullname = typeof parentLayerName === "string" ? `${parentLayerName}.${blockRule.name}` : blockRule.name;
    const includeLayer = opts.includeCSSLayers.length === 0 || opts.includeCSSLayers.some((regex) => regex.test(fullname));
    const layerBlockRules = [];
    const rules = blockRule.cssRules;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      switch (rule.constructor.name) {
        case "CSSLayerBlockRule":
          layerBlockRules.push(rule);
          break;
        case "CSSMediaRule":
          this.#processMediaRule(rule, allStyleRules, opts);
          break;
        case "CSSStyleRule":
          if (includeLayer) {
            allStyleRules.push(rule);
          }
          break;
      }
    }
    for (let i = 0; i < layerBlockRules.length; i++) {
      this.#processLayerBlockRule(layerBlockRules[i], fullname, allStyleRules, opts);
    }
  }
  /**
   * Simple processing of a CSSMediaRule and directly nested CSSStyleRule entries.
   *
   * @param   mediaRule - The `CSSMediaRule` to parse.
   *
   * @param   allStyleRules - All style rules to process.
   *
   * @param   opts - Sanitized process options.
   */
  #processMediaRule(mediaRule, allStyleRules, opts) {
    if (!opts.mediaQuery) {
      return;
    }
    if (!window.matchMedia(mediaRule.media.mediaText).matches) {
      return;
    }
    if (!_a.#MEDIA_RULE_PREFERS.test(mediaRule.media.mediaText)) {
      return;
    }
    const rules = mediaRule.cssRules;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      switch (rule.constructor.name) {
        case "CSSStyleRule":
          allStyleRules.push(rule);
          break;
      }
    }
  }
  /**
   * Processes all collected `CSSStyleRules`.
   *
   * @param   allStyleRules - Style rules to parse.
   *
   * @param   opts - ProcessOptions.
   */
  #processStyleRules(allStyleRules, opts) {
    for (let i = 0; i < allStyleRules.length; i++) {
      const styleRule = allStyleRules[i];
      const selectorParts = StyleParse.selectorText(styleRule.selectorText, opts);
      if (selectorParts.length) {
        const result = StyleParse.cssText(styleRule.style.cssText);
        if (opts.urlRewrite && opts.baseHref && _a.#URL_DETECTION_REGEX.test(styleRule.style.cssText)) {
          this.#processStyleRuleUrls(result, opts);
        }
        for (let j = selectorParts.length; --j >= 0; ) {
          const part = selectorParts[j];
          if (this.#sheetMap.has(part)) {
            Object.assign(this.#sheetMap.get(part), result);
          } else {
            this.#sheetMap.set(part, result);
          }
        }
      }
    }
  }
  /**
   * Resolve relative `url(...)` references in CSS property values based on the stylesheet origin.
   *
   * This method rewrites relative paths in `url(...)` to absolute paths (IE `/assets/img.png`) using the
   * CSSStyleSheet `href` when available or falling back to the provided `baseHref` for inline stylesheets.
   *
   * @param result - Parsed CSS property key-value map.
   *
   * @param opts - Processing options.
   */
  #processStyleRuleUrls(result, opts) {
    const baseHref = opts.baseHref;
    for (const key in result) {
      let value = result[key];
      if (value.indexOf("url(") === -1) {
        continue;
      }
      if (!_a.#URL_DETECTION_REGEX.test(value)) {
        continue;
      }
      let modified = false;
      value = value.replace(_a.#URL_REGEX, (match, quote, relPath) => {
        try {
          const absPath = new URL(relPath, baseHref).pathname;
          modified = true;
          return `url(${quote}${absPath}${quote})`;
        } catch {
          return match;
        }
      });
      if (modified) {
        result[key] = value;
      }
    }
  }
  /**
   * Resolves intermediate CSS variables defined in the `result` style properties object with data from the given
   * `resolve` selector(s).
   *
   * @param   result - Copy of source selector style properties to resolve.
   *
   * @param   resolve - Parent CSS variable resolution selectors.
   *
   * @param   resolveData - Resolution data.
   */
  #resolve(result, resolve, resolveData) {
    const parentVars = {};
    for (let i = 0; i < resolve.length; i++) {
      const entry = resolve[i];
      const parent = this.get(entry);
      if (!isObject(parent)) {
        resolveData.parentNotFound.add(entry);
        continue;
      }
      for (const key in parent) {
        if (key.startsWith("--")) {
          parentVars[key] = parent[key];
        }
      }
    }
    const cssVars = new ResolveVars(result, parentVars, resolveData);
    if (!cssVars.unresolvedCount) {
      return;
    }
    for (const key in parentVars) {
      cssVars.set(key, parentVars[key]);
    }
    Object.assign(result, cssVars.resolved);
  }
};
_a = StyleSheetResolve;
var ResolveVars = class {
  /**
   * Detect CSS variable.
   */
  static #DETECT_CSS_VAR_REGEX = /--[\w-]+/g;
  /**
   * Capture CSS variable fallbacks.
   */
  static #CSS_VAR_FALLBACK_REGEX = /^var\((?<varName>--[\w-]+)\s*,\s*(?<fallback>.+?)\)$/;
  /**
   * Replace CSS variable fallbacks.
   */
  static #CSS_VAR_FALLBACK_REPLACE_REGEX = /var\((--[\w-]+)(?:\s*,\s*[^()]*?)?\)/g;
  /**
   * Closed CSS variable.
   */
  static #CSS_VAR_REGEX = /^var\((--[\w-]+)\)$/;
  /**
   * Open CSS variable.
   */
  static #CSS_VAR_PARTIAL_REGEX = /^var\((--[\w-]+)/;
  /**
   * Prevent deep fallback recursion.
   */
  static #MAX_FALLBACK_DEPTH = 10;
  /**
   * Initial style properties w/ CSS variables to track.
   */
  #propMap = /* @__PURE__ */ new Map();
  /**
   * Reverse lookup for CSS variable name to associated property.
   */
  #varToProp = /* @__PURE__ */ new Map();
  /**
   * Resolved CSS variable from parent selector properties.
   */
  #varResolved = /* @__PURE__ */ new Map();
  #parentVars;
  #resolveData;
  /**
   * @param initial - Initial style entry to resolve.
   *
   * @param parentVars - All parent resolution vars.
   *
   * @param resolveData - Resolution data.
   */
  constructor(initial, parentVars, resolveData) {
    this.#parentVars = parentVars;
    this.#resolveData = resolveData;
    for (const prop in initial) {
      const value = initial[prop];
      let match;
      _b.#DETECT_CSS_VAR_REGEX.lastIndex = 0;
      let found = false;
      while (match = _b.#DETECT_CSS_VAR_REGEX.exec(value)) {
        const entry = match[0];
        if (!this.#varToProp.has(entry))
          this.#varToProp.set(entry, /* @__PURE__ */ new Set());
        this.#varToProp.get(entry).add(prop);
        found = true;
      }
      if (found)
        this.#propMap.set(prop, value);
    }
  }
  /**
   * Resolves properties in `#propMap` by substituting var(...) expressions using resolved values in #varResolved. If
   * no resolution is available, attempts to preserve fallback expressions in their original var(...) form.
   *
   * Supports chained fallbacks like: var(--a, var(--b, var(--c, red))) and resolving variables in statements like
   * `calc(1rem + var(--x))`.
   *
   * @returns All fields that have been resolved.
   */
  get resolved() {
    const result = {};
    for (const entry of this.#varToProp.keys()) {
      const props = this.#varToProp.get(entry);
      const varResolved = this.#varResolved.get(entry);
      if (!props) {
        continue;
      }
      if (varResolved) {
        for (const prop of props) {
          let value = this.#propMap.get(prop);
          if (value.indexOf(`var(${entry}`) !== -1) {
            value = value.replace(_b.#CSS_VAR_FALLBACK_REPLACE_REGEX, (match) => {
              const varName = match.match(_b.#CSS_VAR_PARTIAL_REGEX)?.[1];
              const resolved = this.#varResolved.get(varName);
              return resolved ?? match;
            });
          }
          this.#propMap.set(prop, value);
          result[prop] = value;
        }
      } else {
        for (const prop of props) {
          const value = this.#propMap.get(prop);
          if (value.indexOf(`var(${entry}`) === -1) {
            continue;
          }
          const fallback = this.#resolveNestedFallback(value);
          this.#propMap.set(prop, fallback);
          result[prop] = fallback;
        }
      }
    }
    return result;
  }
  /**
   * @returns Unresolved field count.
   */
  get unresolvedCount() {
    let count = 0;
    for (const entry of this.#varToProp.keys()) {
      if (!this.#varResolved.has(entry)) {
        count++;
      }
    }
    return count;
  }
  /**
   * Sets the parent selector defined CSS variable for resolution.
   *
   * @param name - CSS variable name
   *
   * @param value - Value of target CSS variable.
   */
  set(name, value) {
    if (typeof value !== "string" || value.length === 0) {
      return;
    }
    if (this.#resolveData.warnCycles) {
      this.#setCycleWarn(name, value);
    } else {
      if (this.#varToProp.has(name) && !this.#varResolved.has(name)) {
        this.#varResolved.set(name, value);
      }
    }
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Performs DFS traversal to detect cycles in CSS variable resolution. Tracks the resolution path and emits a
   * warning if a cycle is found. Each affected property is reported once with its originating chain.
   *
   * @param   value - Value of target CSS variable.
   *
   * @param   visited - Visited CSS variables.
   *
   * @param   seenCycles - Dedupe cyclic dependency warnings.
   *
   * @returns Resolution result or undefined.
   */
  #resolveCycleWarn(value, visited, seenCycles) {
    const match = value.match(_b.#CSS_VAR_REGEX);
    if (!match) {
      return value;
    }
    const next = match[1];
    if (visited.has(next)) {
      const cycleChain = [...visited, next];
      const cycleKey = cycleChain.join("→");
      if (!seenCycles.has(cycleKey)) {
        seenCycles.add(cycleKey);
        const affected = cycleChain.flatMap((varName) => Array.from(this.#varToProp.get(varName) ?? []).map((prop) => `- ${prop} (via ${varName})`));
        if (affected.length > 0) {
          console.warn(`[TyphonJS Runtime] StyleSheetResolve - CSS variable cyclic dependency detected: ${cycleChain.join(" → ")}
Affected properties:
${affected.join("\n")}`);
        }
      }
      return void 0;
    }
    visited.add(next);
    const nextValue = this.#varResolved.get(next) ?? this.#parentVars[next];
    if (typeof nextValue !== "string") {
      return void 0;
    }
    return this.#resolveCycleWarn(nextValue, visited, seenCycles);
  }
  /**
   * Resolve fallback chains of the form: var(--a, var(--b, ...))
   * - Only replaces the top-level var if it is resolved.
   * - Leaves fallback intact if unresolved.
   * - Recursively evaluates nested fallbacks if they are var(...).
   * - Limits recursion depth to prevent cycles or stack overflow.
   *
   * @param   expr - CSS var expression to resolve.
   *
   * @param   depth - Recursion guard
   *
   * @returns Nested fallback resolution result.
   */
  #resolveNestedFallback(expr, depth = 0) {
    if (depth > _b.#MAX_FALLBACK_DEPTH) {
      return expr;
    }
    const match = expr.match(_b.#CSS_VAR_FALLBACK_REGEX);
    if (!match?.groups) {
      return expr;
    }
    const { varName, fallback } = match.groups;
    const resolved = this.#varResolved.get(varName);
    if (resolved !== void 0) {
      return resolved;
    }
    const fallbackTrimmed = fallback.trim();
    if (fallbackTrimmed.startsWith("var(")) {
      let nested = this.#resolveNestedFallback(fallbackTrimmed, depth + 1);
      const innerMatch = nested.match(_b.#CSS_VAR_REGEX);
      if (innerMatch) {
        const innerResolved = this.#varResolved.get(innerMatch[1]);
        if (innerResolved !== void 0) {
          nested = innerResolved;
        }
      }
      return `var(${varName}, ${nested})`;
    }
    return `var(${varName}, ${fallbackTrimmed})`;
  }
  /**
   * Sets the parent selector defined CSS variable for resolution with additional cyclic dependency metrics.
   *
   * @param   name - CSS variable name
   *
   * @param   value - Value of target CSS variable.
   */
  #setCycleWarn(name, value) {
    const resolved = this.#resolveCycleWarn(value, /* @__PURE__ */ new Set([name]), this.#resolveData.seenCycles);
    if (resolved !== void 0 && this.#varToProp.has(name) && !this.#varResolved.has(name)) {
      this.#varResolved.set(name, resolved);
    }
  }
};
_b = ResolveVars;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/easing/index.js
var easingList = Object.freeze([
  "backIn",
  "backInOut",
  "backOut",
  "bounceIn",
  "bounceInOut",
  "bounceOut",
  "circIn",
  "circInOut",
  "circOut",
  "cubicIn",
  "cubicInOut",
  "cubicOut",
  "elasticIn",
  "elasticInOut",
  "elasticOut",
  "expoIn",
  "expoInOut",
  "expoOut",
  "linear",
  "quadIn",
  "quadInOut",
  "quadOut",
  "quartIn",
  "quartInOut",
  "quartOut",
  "quintIn",
  "quintInOut",
  "quintOut",
  "sineIn",
  "sineInOut",
  "sineOut"
]);
var easingFunc = easing_exports;
function getEasingFunc(easingRef, options) {
  if (typeof easingRef === "function") {
    return easingRef;
  }
  const easingFn = easingFunc[easingRef];
  return easingFn ? easingFn : easingFunc[options?.default ?? "linear"];
}

// node_modules/@typhonjs-fvtt/runtime/_dist/util/a11y/index.js
var A11yHelper = class _A11yHelper {
  /**
   * You can set global focus debugging enabled by setting `A11yHelper.debug = true`.
   *
   * @type {boolean}
   */
  static #globalDebug = false;
  /**
   * @returns {boolean} Global debugging enabled.
   */
  static get debug() {
    return this.#globalDebug;
  }
  /**
   * @param {boolean}  debug - Global debug enabled
   */
  static set debug(debug) {
    if (typeof debug !== "boolean") {
      throw new TypeError(`'debug' is not a boolean.`);
    }
    this.#globalDebug = debug;
  }
  /**
   * Runs a media query to determine if the user / OS configuration is set up for reduced motion / animation.
   *
   * @returns {boolean} User prefers reduced motion.
   */
  static get prefersReducedMotion() {
    return globalThis?.matchMedia("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }
  /**
   * Apply focus to the HTMLElement / SVGElement targets in a given A11yFocusSource data object. An iterable list
   * `options.focusEl` can contain HTMLElement / SVGElements or selector strings. If multiple focus targets are
   * provided in a list then the first valid target found will be focused. If focus target is a string then a lookup
   * via `document.querySelector` is performed. In this case you should provide a unique selector for the desired
   * focus target.
   *
   * Note: The body of this method is postponed to the next clock tick to allow any changes in the DOM to occur that
   * might alter focus targets before applying.
   *
   * @param {A11yFocusSource | { focusSource: A11yFocusSource }}   options - The focus options instance to apply.
   */
  static applyFocusSource(options) {
    if (!isObject(options)) {
      return;
    }
    const focusOpts = isObject(options?.focusSource) ? options.focusSource : options;
    setTimeout(() => {
      const debug = typeof focusOpts.debug === "boolean" ? this.debug || focusOpts.debug : this.debug;
      if (isIterable(focusOpts.focusEl)) {
        if (debug) {
          console.debug(
            `A11yHelper.applyFocusSource debug - Attempting to apply focus target: `,
            focusOpts.focusEl
          );
        }
        for (const target of focusOpts.focusEl) {
          if (target?.nodeType === Node.ELEMENT_NODE && target?.isConnected) {
            target?.focus();
            if (debug) {
              console.debug(`A11yHelper.applyFocusSource debug - Applied focus to target: `, target);
            }
            break;
          } else if (typeof target === "string") {
            const element2 = document.querySelector(target);
            if (element2?.nodeType === Node.ELEMENT_NODE && element2?.isConnected) {
              element2?.focus();
              if (debug) {
                console.debug(`A11yHelper.applyFocusSource debug - Applied focus to target: `, element2);
              }
              break;
            } else if (debug) {
              console.debug(`A11yHelper.applyFocusSource debug - Could not query selector: `, target);
            }
          }
        }
      } else if (debug) {
        console.debug(`A11yHelper.applyFocusSource debug - No focus targets defined.`);
      }
    }, 0);
  }
  /**
   * Returns first focusable element within a specified element.
   *
   * @param {Element | Document} [element=document] - Optional element to start query.
   *
   * @param {FocusableElementOptions} [options] - Optional parameters.
   *
   * @returns {FocusableElement} First focusable child element.
   */
  static getFirstFocusableElement(element2 = document, options) {
    const focusableElements = this.getFocusableElements(element2, options);
    return focusableElements.length > 0 ? focusableElements[0] : void 0;
  }
  /**
   * Returns all focusable elements within a specified element.
   *
   * @param {Element | Document} [element=document] Optional element to start query.
   *
   * @param {FocusableElementOptions} [options] - Optional parameters.
   *
   * @returns {Array<FocusableElement>} Child keyboard focusable elements.
   */
  static getFocusableElements(element2 = document, {
    anchorHref = true,
    ignoreClasses,
    ignoreElements,
    parentHidden = false,
    selectors
  } = {}) {
    if (element2?.nodeType !== Node.ELEMENT_NODE && element2?.nodeType !== Node.DOCUMENT_NODE) {
      throw new TypeError(`'element' is not a HTMLElement, SVGElement, or Document instance.`);
    }
    if (typeof anchorHref !== "boolean") {
      throw new TypeError(`'anchorHref' is not a boolean.`);
    }
    if (ignoreClasses !== void 0 && !isIterable(ignoreClasses)) {
      throw new TypeError(`'ignoreClasses' is not an iterable list.`);
    }
    if (ignoreElements !== void 0 && !CrossWindow.isSet(ignoreElements)) {
      throw new TypeError(`'ignoreElements' is not a Set.`);
    }
    if (selectors !== void 0 && typeof selectors !== "string") {
      throw new TypeError(`'selectors' is not a string.`);
    }
    const selectorQuery = selectors ?? this.#getFocusableSelectors(anchorHref);
    let allElements = [...element2.querySelectorAll(selectorQuery)];
    if (ignoreElements && ignoreClasses) {
      allElements = allElements.filter((el) => {
        let hasIgnoreClass = false;
        for (const ignoreClass of ignoreClasses) {
          if (el.classList.contains(ignoreClass)) {
            hasIgnoreClass = true;
            break;
          }
        }
        return !hasIgnoreClass && !ignoreElements.has(el) && el.style.display !== "none" && el.style.visibility !== "hidden" && !el.hasAttribute("disabled") && !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true";
      });
    } else if (ignoreClasses) {
      allElements = allElements.filter((el) => {
        let hasIgnoreClass = false;
        for (const ignoreClass of ignoreClasses) {
          if (el.classList.contains(ignoreClass)) {
            hasIgnoreClass = true;
            break;
          }
        }
        return !hasIgnoreClass && el.style.display !== "none" && el.style.visibility !== "hidden" && !el.hasAttribute("disabled") && !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true";
      });
    } else if (ignoreElements) {
      allElements = allElements.filter((el) => {
        return !ignoreElements.has(el) && el.style.display !== "none" && el.style.visibility !== "hidden" && !el.hasAttribute("disabled") && !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true";
      });
    } else {
      allElements = allElements.filter((el) => {
        return el.style.display !== "none" && el.style.visibility !== "hidden" && !el.hasAttribute("disabled") && !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true";
      });
    }
    if (parentHidden) {
      allElements = allElements.filter((el) => {
        return !this.isParentHidden(el, element2);
      });
    }
    return allElements;
  }
  /**
   * Returns the default focusable selectors query.
   *
   * @param {boolean}  [anchorHref=true] - When true anchors must have an HREF.
   *
   * @returns {string} Focusable selectors for `querySelectorAll`.
   */
  static #getFocusableSelectors(anchorHref = true) {
    return `button, [contenteditable=""], [contenteditable="true"], details summary:not([tabindex="-1"]), embed, a${anchorHref ? "[href]" : ""}, iframe, object, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])`;
  }
  /**
   * Gets a A11yFocusSource object from the given DOM event allowing for optional X / Y screen space overrides.
   * Browsers (Firefox / Chrome) forwards a mouse event for the context menu keyboard button. Provides detection of
   * when the context menu event is from the keyboard. Firefox as of (1/23) does not provide the correct screen space
   * coordinates, so for keyboard context menu presses coordinates are generated from the centroid point of the
   * element.
   *
   * A default fallback element or selector string may be provided to provide the focus target. If the event comes from
   * the keyboard however the source focused element is inserted as the target with the fallback value appended to the
   * list of focus targets. When A11yFocusSource is applied by {@link A11yHelper.applyFocusSource} the target focus
   * list is iterated through until a connected target is found and focus applied.
   *
   * @param {object} options - Options
   *
   * @param {KeyboardEvent | MouseEvent}   [options.event] - The source DOM event.
   *
   * @param {boolean} [options.debug] - When true {@link A11yHelper.applyFocusSource} logs focus target data.
   *
   * @param {FocusableElement | string} [options.focusEl] - A specific HTMLElement / SVGElement or selector
   *        string as the focus target.
   *
   * @param {number}   [options.x] - Used when an event isn't provided; integer of event source in screen space.
   *
   * @param {number}   [options.y] - Used when an event isn't provided; integer of event source in screen space.
   *
   * @returns {A11yFocusSource} A A11yFocusSource object.
   *
   * @see https://bugzilla.mozilla.org/show_bug.cgi?id=1426671
   * @see https://bugzilla.mozilla.org/show_bug.cgi?id=314314
   *
   * @privateRemarks
   * TODO: Evaluate / test against touch input devices.
   */
  static getFocusSource({ event, x, y, focusEl, debug = false }) {
    if (focusEl !== void 0 && !this.isFocusSource(focusEl)) {
      throw new TypeError(
        `A11yHelper.getFocusSource error: 'focusEl' is not a HTMLElement, SVGElement, or string.`
      );
    }
    if (debug !== void 0 && typeof debug !== "boolean") {
      throw new TypeError(`A11yHelper.getFocusSource error: 'debug' is not a boolean.`);
    }
    const debugEnabled = typeof debug === "boolean" ? this.debug || debug : this.debug;
    if (event === void 0) {
      if (typeof x !== "number") {
        throw new TypeError(`A11yHelper.getFocusSource error: 'event' not defined and 'x' is not a number.`);
      }
      if (typeof y !== "number") {
        throw new TypeError(`A11yHelper.getFocusSource error: 'event' not defined and 'y' is not a number.`);
      }
      const result2 = {
        debug,
        focusEl: focusEl !== void 0 ? [focusEl] : void 0,
        x,
        y
      };
      if (debugEnabled) {
        console.debug(`A11yHelper.getFocusSource debug: generated 'focusSource' without event: `, result2);
      }
      return result2;
    }
    if (event !== void 0 && !CrossWindow.isUserInputEvent(event)) {
      throw new TypeError(
        `A11yHelper.getFocusSource error: 'event' is not a KeyboardEvent, MouseEvent, or PointerEvent.`
      );
    }
    if (x !== void 0 && !Number.isInteger(x)) {
      throw new TypeError(`A11yHelper.getFocusSource error: 'x' is not a number.`);
    }
    if (y !== void 0 && !Number.isInteger(y)) {
      throw new TypeError(`A11yHelper.getFocusSource error: 'y' is not a number.`);
    }
    let targetEl;
    if (event) {
      if (_A11yHelper.isFocusable(event.target)) {
        targetEl = event.target;
        if (debugEnabled) {
          console.debug(`A11yHelper.getFocusSource debug: 'targetEl' set to event.target: `, targetEl);
        }
      } else if (_A11yHelper.isFocusable(event.currentTarget)) {
        targetEl = event.currentTarget;
        if (debugEnabled) {
          console.debug(`A11yHelper.getFocusSource debug: 'targetEl' set to event.currentTarget: `, targetEl);
        }
      } else {
        if (debugEnabled) {
          console.debug(
            `A11yHelper.getFocusSource debug: 'event.target' / 'event.currentTarget' are not focusable.`
          );
          console.debug(`A11yHelper.getFocusSource debug: 'event.target': `, event.target);
          console.debug(`A11yHelper.getFocusSource debug: 'event.currentTarget': `, event.currentTarget);
        }
      }
      if (targetEl) {
        if (targetEl?.nodeType !== Node.ELEMENT_NODE && typeof targetEl?.focus !== "function") {
          throw new TypeError(`A11yHelper.getFocusSource error: 'targetEl' is not an HTMLElement or SVGElement.`);
        }
      }
    }
    const result = { debug };
    if (CrossWindow.isPointerEvent(event)) {
      if (event?.button !== 2 && event.type === "contextmenu") {
        const rectTarget = targetEl ?? event.target;
        const rect = rectTarget.getBoundingClientRect();
        result.source = "keyboard";
        result.x = x ?? rect.left + rect.width / 2;
        result.y = y ?? rect.top + rect.height / 2;
        result.focusEl = targetEl ? [targetEl] : [];
        if (focusEl) {
          result.focusEl.push(focusEl);
        }
      } else {
        result.source = "pointer";
        result.x = x ?? event.pageX;
        result.y = y ?? event.pageY;
        result.focusEl = targetEl ? [targetEl] : [];
        if (focusEl) {
          result.focusEl.push(focusEl);
        }
      }
    } else {
      const rectTarget = targetEl ?? event?.target;
      if (rectTarget) {
        const rect = rectTarget.getBoundingClientRect();
        result.source = "keyboard";
        result.x = x ?? rect.left + rect.width / 2;
        result.y = y ?? rect.top + rect.height / 2;
        result.focusEl = targetEl ? [targetEl] : [];
      }
      if (focusEl) {
        result.focusEl.push(focusEl);
      }
    }
    if (debugEnabled) {
      console.debug(`A11yHelper.getFocusSource debug: generated 'focusSource' with event: `, result);
    }
    return result;
  }
  /**
   * Returns first focusable element within a specified element.
   *
   * @param {Element | Document} [element=document] - Optional element to start query.
   *
   * @param {FocusableElementOptions} [options] - Optional parameters.
   *
   * @returns {FocusableElement} Last focusable child element.
   */
  static getLastFocusableElement(element2 = document, options) {
    const focusableElements = this.getFocusableElements(element2, options);
    return focusableElements.length > 0 ? focusableElements[focusableElements.length - 1] : void 0;
  }
  /**
   * Tests if the given element is focusable.
   *
   * @param {unknown} el - Element to test.
   *
   * @param {object} [options] - Optional parameters.
   *
   * @param {boolean} [options.anchorHref=true] - When true anchors must have an HREF.
   *
   * @param {Iterable<string>} [options.ignoreClasses] - Iterable list of classes to ignore elements.
   *
   * @returns {boolean} Element is focusable.
   */
  static isFocusable(el, { anchorHref = true, ignoreClasses } = {}) {
    if (el === void 0 || el === null || el?.hidden || !el?.isConnected || el?.nodeType !== Node.ELEMENT_NODE || typeof el?.focus !== "function") {
      return false;
    }
    if (typeof anchorHref !== "boolean") {
      throw new TypeError(`'anchorHref' is not a boolean.`);
    }
    if (ignoreClasses !== void 0 && !isIterable(ignoreClasses)) {
      throw new TypeError(`'ignoreClasses' is not an iterable list.`);
    }
    const contenteditableAttr = el.getAttribute("contenteditable");
    const contenteditableFocusable = typeof contenteditableAttr === "string" && (contenteditableAttr === "" || contenteditableAttr === "true");
    const tabindexAttr = globalThis.parseInt(el.getAttribute("tabindex"));
    const tabindexFocusable = Number.isInteger(tabindexAttr) && tabindexAttr >= 0;
    if (contenteditableFocusable || tabindexFocusable || CrossWindow.isFocusableHTMLElement(el)) {
      if (anchorHref && !tabindexFocusable && CrossWindow.isHTMLAnchorElement(el) && typeof el.getAttribute("href") !== "string") {
        return false;
      }
      return el.style.display !== "none" && el.style.visibility !== "hidden" && !el.hasAttribute("disabled") && !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true";
    }
    return false;
  }
  /**
   * Convenience method to check if the given data is a valid focus source.
   *
   * @param {Element | EventTarget | string}   data - Either an HTMLElement, SVGElement, or selector string.
   *
   * @returns {boolean} Is valid focus source.
   */
  static isFocusSource(data) {
    return typeof data === "string" || data?.nodeType === Node.ELEMENT_NODE && typeof data?.focus === "function";
  }
  /**
   * Tests if the given `element` is a Element node and has a `focus` method.
   *
   * @param {unknown}  element - Element to test for focus method.
   *
   * @returns {element is FocusableElement} Whether the element has a focus method.
   */
  static isFocusTarget(element2) {
    return element2 !== void 0 && element2 !== null && element2?.nodeType === Node.ELEMENT_NODE && typeof element2?.focus === "function";
  }
  /**
   * Perform a parent traversal from the current active element attempting to match the given element to test whether
   * current active element is within that element.
   *
   * @param {Element}  element - An element to match in parent traversal from the active element.
   *
   * @returns {boolean} Whether there is focus within the given element.
   */
  static isFocusWithin(element2) {
    if (!isObject(element2) || element2?.hidden || !element2?.isConnected) {
      return false;
    }
    let active = CrossWindow.getActiveElement(element2);
    if (!active) {
      return false;
    }
    while (active) {
      if (active === element2) {
        return true;
      }
      active = active.parentElement;
    }
    return false;
  }
  /**
   * Traverses the given element's parent elements to check if any parent has `offsetWidth` and `offsetHeight` of 0,
   * indicating that a parent element is hidden. If a parent element is hidden, the given element is also considered
   * hidden. This is a reasonably efficient check and can be enabled as a filter step in conjunction with focusable
   * element detection methods like {@link A11yHelper.getFocusableElements}.
   *
   * @param {Element}  element - The starting element to check.
   *
   * @param {Element}  [stopElement] - The stopping parent element for traversal. If not defined, `document.body` is
   *        used as the stopping element.
   *
   * @returns {boolean} `true` if a parent element of the given element is hidden; otherwise, `false`.
   */
  static isParentHidden(element2, stopElement) {
    if (!CrossWindow.isElement(element2)) {
      throw new TypeError(`'element' is not an Element.`);
    }
    stopElement = stopElement ?? CrossWindow.getDocument(element2)?.body;
    if (!CrossWindow.isElement(stopElement)) {
      throw new TypeError(`'stopElement' must be an Element.`);
    }
    let current = element2.parentElement;
    while (current) {
      if (current === stopElement) {
        break;
      }
      if (current.offsetWidth === 0 && current.offsetHeight === 0) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/math/util/index.js
function clamp(value = 0, min = 0, max = 0) {
  return Math.min(Math.max(value, min), max);
}
function degToRad(deg) {
  return deg * (Math.PI / 180);
}
function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

// node_modules/@typhonjs-fvtt/runtime/_dist/math/interpolate/index.js
function lerp(start, end, amount) {
  return (1 - amount) * start + amount * end;
}

// node_modules/@typhonjs-fvtt/runtime/_dist/math/gl-matrix/index.js
var GLM_EPSILON = 1e-6;
var Mat2 = class _Mat2 extends Float32Array {
  static #IDENTITY_2X2 = new Float32Array([
    1,
    0,
    0,
    1
  ]);
  /**
   * Create a {@link Mat2}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 4:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 4);
        break;
      case 1:
        const v = values[0];
        if (typeof v === "number") {
          super([
            v,
            v,
            v,
            v
          ]);
        } else {
          super(v, 0, 4);
        }
        break;
      default:
        super(_Mat2.#IDENTITY_2X2);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  /**
   * A string representation of `this`
   * Equivalent to `Mat2.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Mat2.str(this);
  }
  // ===================
  // Instance methods
  // ===================
  /**
   * Copy the values from another {@link Mat2} into `this`.
   *
   * @param a the source vector
   * @returns `this`
   * @category Methods
   */
  copy(a) {
    this.set(a);
    return this;
  }
  /**
   * Set `this` to the identity matrix
   * Equivalent to Mat2.identity(this)
   *
   * @returns `this`
   * @category Methods
   */
  identity() {
    this.set(_Mat2.#IDENTITY_2X2);
    return this;
  }
  /**
   * Multiplies this {@link Mat2} against another one
   * Equivalent to `Mat2.multiply(this, this, b);`
   *
   * @param b - The second operand
   * @returns `this`
   * @category Methods
   */
  multiply(b) {
    return _Mat2.multiply(this, this, b);
  }
  /**
   * Alias for {@link Mat2.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Transpose this {@link Mat2}
   * Equivalent to `Mat2.transpose(this, this);`
   *
   * @returns `this`
   * @category Methods
   */
  transpose() {
    return _Mat2.transpose(this, this);
  }
  /**
   * Inverts this {@link Mat2}
   * Equivalent to `Mat4.invert(this, this);`
   *
   * @returns `this`
   * @category Methods
   */
  invert() {
    return _Mat2.invert(this, this);
  }
  /**
   * Scales this {@link Mat2} by the dimensions in the given vec3 not using vectorization
   * Equivalent to `Mat2.scale(this, this, v);`
   *
   * @param v - The {@link Vec2} to scale the matrix by
   * @returns `this`
   * @category Methods
   */
  scale(v) {
    return _Mat2.scale(this, this, v);
  }
  /**
   * Rotates this {@link Mat2} by the given angle around the given axis
   * Equivalent to `Mat2.rotate(this, this, rad);`
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   * @category Methods
   */
  rotate(rad) {
    return _Mat2.rotate(this, this, rad);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Mat2}.
   */
  static get BYTE_LENGTH() {
    return 4 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, identity {@link Mat2}
   * @category Static
   *
   * @returns A new {@link Mat2}
   */
  static create() {
    return new _Mat2();
  }
  /**
   * Creates a new {@link Mat2} initialized with values from an existing matrix
   * @category Static
   *
   * @param a - Matrix to clone
   * @returns A new {@link Mat2}
   */
  static clone(a) {
    return new _Mat2(a);
  }
  /**
   * Copy the values from one {@link Mat2} to another
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - Matrix to copy
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  /**
   * Create a new {@link Mat2} with the given values
   * @category Static
   *
   * @param values - Matrix components
   * @returns A new {@link Mat2}
   */
  static fromValues(...values) {
    return new _Mat2(...values);
  }
  /**
   * Set the components of a {@link Mat2} to the given values
   * @category Static
   *
   * @param out - The receiving matrix
   * @param values - Matrix components
   * @returns `out`
   */
  static set(out, ...values) {
    out[0] = values[0];
    out[1] = values[1];
    out[2] = values[2];
    out[3] = values[3];
    return out;
  }
  /**
   * Set a {@link Mat2} to the identity matrix
   * @category Static
   *
   * @param out - The receiving matrix
   * @returns `out`
   */
  static identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  /**
   * Transpose the values of a {@link Mat2}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static transpose(out, a) {
    if (out === a) {
      const a1 = a[1];
      out[1] = a[2];
      out[2] = a1;
    } else {
      out[0] = a[0];
      out[1] = a[2];
      out[2] = a[1];
      out[3] = a[3];
    }
    return out;
  }
  /**
   * Inverts a {@link Mat2}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out` or `null` if the matrix is not invertible
   */
  static invert(out, a) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    let det = a0 * a3 - a2 * a1;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = a3 * det;
    out[1] = -a1 * det;
    out[2] = -a2 * det;
    out[3] = a0 * det;
    return out;
  }
  /**
   * Calculates the adjugate of a {@link Mat2}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static adjoint(out, a) {
    const a0 = a[0];
    out[0] = a[3];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a0;
    return out;
  }
  /**
   * Calculates the determinant of a {@link Mat2}
   * @category Static
   *
   * @param a - the source matrix
   * @returns determinant of a
   */
  static determinant(a) {
    return a[0] * a[3] - a[2] * a[1];
  }
  /**
   * Adds two {@link Mat2}'s
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
  }
  /**
   * Subtracts matrix b from matrix a
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
  }
  /**
   * Alias for {@link Mat2.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return out;
  }
  /**
   * Multiplies two {@link Mat2}s
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    return out;
  }
  /**
   * Alias for {@link Mat2.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Rotates a {@link Mat2} by the given angle
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotate(out, a, rad) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = a0 * c + a2 * s;
    out[1] = a1 * c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    return out;
  }
  /**
   * Scales the {@link Mat2} by the dimensions in the given {@link Vec2}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param v - the {@link Vec2} to scale the matrix by
   * @returns `out`
   **/
  static scale(out, a, v) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const v0 = v[0];
    const v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    return out;
  }
  /**
   * Creates a {@link Mat2} from a given angle around a given axis
   * This is equivalent to (but much faster than):
   * ```js
   *   mat2.identity(dest);
   *   mat2.rotate(dest, dest, rad);
   * ```
   * @category Static
   *
   * @param out - {@link Mat2} receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromRotation(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = -s;
    out[3] = c;
    return out;
  }
  /**
   * Creates a {@link Mat2} from a vector scaling
   * This is equivalent to (but much faster than):
   * ```js
   *   mat2.identity(dest);
   *   mat2.scale(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat2} receiving operation result
   * @param v - Scaling vector
   * @returns `out`
   */
  static fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = v[1];
    return out;
  }
  /**
   * Returns Frobenius norm of a {@link Mat2}
   * @category Static
   *
   * @param a - the matrix to calculate Frobenius norm of
   * @returns Frobenius norm
   */
  static frob(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]);
  }
  /**
   * Multiply each element of a {@link Mat2} by a scalar.
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param b - amount to scale the matrix's elements by
   * @returns `out`
   */
  static multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    return out;
  }
  /**
   * Adds two {@link Mat2}'s after multiplying each element of the second operand by a scalar value.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b's elements by before adding
   * @returns `out`
   */
  static multiplyScalarAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    out[3] = a[3] + b[3] * scale;
    return out;
  }
  /**
   * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
   * @category Static
   *
   * @param L - the lower triangular matrix
   * @param D - the diagonal matrix
   * @param U - the upper triangular matrix
   * @param a - the input matrix to factorize
   */
  static LDU(L, D, U, a) {
    L[2] = a[2] / a[0];
    U[0] = a[0];
    U[1] = a[1];
    U[3] = a[3] - L[2] * U[1];
    return [L, D, U];
  }
  /**
   * Returns whether two {@link Mat2}s have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  /**
   * Returns whether two {@link Mat2}s have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= GLM_EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
  /**
   * Returns a string representation of a {@link Mat2}
   * @category Static
   *
   * @param a - matrix to represent as a string
   * @returns string representation of the matrix
   */
  static str(a) {
    return `Mat2(${a.join(", ")})`;
  }
};
Mat2.prototype.mul = Mat2.prototype.multiply;
Mat2.mul = Mat2.multiply;
Mat2.sub = Mat2.subtract;
var Mat2d = class _Mat2d extends Float32Array {
  static #IDENTITY_2X3 = new Float32Array([
    1,
    0,
    0,
    1,
    0,
    0
  ]);
  /**
   * Create a {@link Mat2}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 6:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 6);
        break;
      case 1:
        const v = values[0];
        if (typeof v === "number") {
          super([
            v,
            v,
            v,
            v,
            v,
            v
          ]);
        } else {
          super(v, 0, 6);
        }
        break;
      default:
        super(_Mat2d.#IDENTITY_2X3);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  /**
   * A string representation of `this`
   * Equivalent to `Mat2d.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Mat2d.str(this);
  }
  // ===================
  // Instances methods
  // ===================
  /**
   * Copy the values from another {@link Mat2d} into `this`.
   * @category Methods
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a) {
    this.set(a);
    return this;
  }
  /**
   * Set `this` to the identity matrix
   * Equivalent to Mat2d.identity(this)
   * @category Methods
   *
   * @returns `this`
   */
  identity() {
    this.set(_Mat2d.#IDENTITY_2X3);
    return this;
  }
  /**
   * Multiplies this {@link Mat2d} against another one
   * Equivalent to `Mat2d.multiply(this, this, b);`
   * @category Methods
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `this`
   */
  multiply(b) {
    return _Mat2d.multiply(this, this, b);
  }
  /**
   * Alias for {@link Mat2d.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Translate this {@link Mat2d} by the given vector
   * Equivalent to `Mat2d.translate(this, this, v);`
   * @category Methods
   *
   * @param v - The {@link Vec2} to translate by
   * @returns `this`
   */
  translate(v) {
    return _Mat2d.translate(this, this, v);
  }
  /**
   * Rotates this {@link Mat2d} by the given angle around the given axis
   * Equivalent to `Mat2d.rotate(this, this, rad);`
   * @category Methods
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotate(rad) {
    return _Mat2d.rotate(this, this, rad);
  }
  /**
   * Scales this {@link Mat2d} by the dimensions in the given vec3 not using vectorization
   * Equivalent to `Mat2d.scale(this, this, v);`
   * @category Methods
   *
   * @param v - The {@link Vec2} to scale the matrix by
   * @returns `this`
   */
  scale(v) {
    return _Mat2d.scale(this, this, v);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Mat2d}.
   */
  static get BYTE_LENGTH() {
    return 6 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, identity {@link Mat2d}
   * @category Static
   *
   * @returns A new {@link Mat2d}
   */
  static create() {
    return new _Mat2d();
  }
  /**
   * Creates a new {@link Mat2d} initialized with values from an existing matrix
   * @category Static
   *
   * @param a - Matrix to clone
   * @returns A new {@link Mat2d}
   */
  static clone(a) {
    return new _Mat2d(a);
  }
  /**
   * Copy the values from one {@link Mat2d} to another
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - Matrix to copy
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    return out;
  }
  /**
   * Create a new {@link Mat2d} with the given values
   * @category Static
   *
   * @param values - Matrix components
   * @returns A new {@link Mat2d}
   */
  static fromValues(...values) {
    return new _Mat2d(...values);
  }
  /**
   * Set the components of a {@link Mat2d} to the given values
   * @category Static
   *
   * @param out - The receiving matrix
   * @param values - Matrix components
   * @returns `out`
   */
  static set(out, ...values) {
    out[0] = values[0];
    out[1] = values[1];
    out[2] = values[2];
    out[3] = values[3];
    out[4] = values[4];
    out[5] = values[5];
    return out;
  }
  /**
   * Set a {@link Mat2d} to the identity matrix
   * @category Static
   *
   * @param out - The receiving matrix
   * @returns `out`
   */
  static identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    return out;
  }
  /**
   * Inverts a {@link Mat2d}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out` or `null` if the matrix is not invertible
   */
  static invert(out, a) {
    const aa = a[0];
    const ab = a[1];
    const ac = a[2];
    const ad = a[3];
    const atx = a[4];
    const aty = a[5];
    let det = aa * ad - ab * ac;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = ad * det;
    out[1] = -ab * det;
    out[2] = -ac * det;
    out[3] = aa * det;
    out[4] = (ac * aty - ad * atx) * det;
    out[5] = (ab * atx - aa * aty) * det;
    return out;
  }
  /**
   * Calculates the determinant of a {@link Mat2d}
   * @category Static
   *
   * @param a - the source matrix
   * @returns determinant of a
   */
  static determinant(a) {
    return a[0] * a[3] - a[1] * a[2];
  }
  /**
   * Adds two {@link Mat2d}'s
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    return out;
  }
  /**
   * Subtracts matrix b from matrix a
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    return out;
  }
  /**
   * Alias for {@link Mat2d.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return out;
  }
  /**
   * Multiplies two {@link Mat2d}s
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    const b4 = b[4];
    const b5 = b[5];
    out[0] = a0 * b0 + a2 * b1;
    out[1] = a1 * b0 + a3 * b1;
    out[2] = a0 * b2 + a2 * b3;
    out[3] = a1 * b2 + a3 * b3;
    out[4] = a0 * b4 + a2 * b5 + a4;
    out[5] = a1 * b4 + a3 * b5 + a5;
    return out;
  }
  /**
   * Alias for {@link Mat2d.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Translate a {@link Mat2d} by the given vector
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to translate
   * @param v - vector to translate by
   * @returns `out`
   */
  static translate(out, a, v) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const v0 = v[0];
    const v1 = v[1];
    out[0] = a0;
    out[1] = a1;
    out[2] = a2;
    out[3] = a3;
    out[4] = a0 * v0 + a2 * v1 + a4;
    out[5] = a1 * v0 + a3 * v1 + a5;
    return out;
  }
  /**
   * Rotates a {@link Mat2d} by the given angle
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotate(out, a, rad) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = a0 * c + a2 * s;
    out[1] = a1 * c + a3 * s;
    out[2] = a0 * -s + a2 * c;
    out[3] = a1 * -s + a3 * c;
    out[4] = a4;
    out[5] = a5;
    return out;
  }
  /**
   * Scales the {@link Mat2d} by the dimensions in the given {@link Vec2}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param v - the {@link Vec2} to scale the matrix by
   * @returns `out`
   **/
  static scale(out, a, v) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const v0 = v[0];
    const v1 = v[1];
    out[0] = a0 * v0;
    out[1] = a1 * v0;
    out[2] = a2 * v1;
    out[3] = a3 * v1;
    out[4] = a4;
    out[5] = a5;
    return out;
  }
  // TODO: Got to fromRotation
  /**
   * Creates a {@link Mat2d} from a vector translation
   * This is equivalent to (but much faster than):
   * ```js
   *   Mat2d.identity(dest);
   *   Mat2d.translate(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat2d} receiving operation result
   * @param v - Translation vector
   * @returns `out`
   */
  static fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = v[0];
    out[5] = v[1];
    return out;
  }
  /**
   * Creates a {@link Mat2d} from a given angle around a given axis
   * This is equivalent to (but much faster than):
   * ```js
   *   Mat2d.identity(dest);
   *   Mat2d.rotate(dest, dest, rad);
   * ```
   * @category Static
   *
   * @param out - {@link Mat2d} receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromRotation(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = -s;
    out[3] = c;
    out[4] = 0;
    out[5] = 0;
    return out;
  }
  /**
   * Creates a {@link Mat2d} from a vector scaling
   * This is equivalent to (but much faster than):
   * ```js
   *   Mat2d.identity(dest);
   *   Mat2d.scale(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat2d} receiving operation result
   * @param v - Scaling vector
   * @returns `out`
   */
  static fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = v[1];
    out[4] = 0;
    out[5] = 0;
    return out;
  }
  /**
   * Returns Frobenius norm of a {@link Mat2d}
   * @category Static
   *
   * @param a - the matrix to calculate Frobenius norm of
   * @returns Frobenius norm
   */
  static frob(a) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + 1);
  }
  /**
   * Multiply each element of a {@link Mat2d} by a scalar.
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param b - amount to scale the matrix's elements by
   * @returns `out`
   */
  static multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    return out;
  }
  /**
   * Adds two {@link Mat2d}'s after multiplying each element of the second operand by a scalar value.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b's elements by before adding
   * @returns `out`
   */
  static multiplyScalarAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    out[3] = a[3] + b[3] * scale;
    out[4] = a[4] + b[4] * scale;
    out[5] = a[5] + b[5] * scale;
    return out;
  }
  /**
   * Returns whether two {@link Mat2d}s have exactly the same elements in the same position (when compared with ===).
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5];
  }
  /**
   * Returns whether two {@link Mat2d}s have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    const b4 = b[4];
    const b5 = b[5];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= GLM_EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= GLM_EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= GLM_EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5));
  }
  /**
   * Returns a string representation of a {@link Mat2d}
   * @category Static
   *
   * @param a - matrix to represent as a string
   * @returns string representation of the matrix
   */
  static str(a) {
    return `Mat2d(${a.join(", ")})`;
  }
};
Mat2d.mul = Mat2d.multiply;
Mat2d.sub = Mat2d.subtract;
var Mat3 = class _Mat3 extends Float32Array {
  static #IDENTITY_3X3 = new Float32Array([
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1
  ]);
  /**
   * Create a {@link Mat3}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 9:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 9);
        break;
      case 1:
        const v = values[0];
        if (typeof v === "number") {
          super([
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v
          ]);
        } else {
          super(v, 0, 9);
        }
        break;
      default:
        super(_Mat3.#IDENTITY_3X3);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  /**
   * A string representation of `this`
   * Equivalent to `Mat3.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Mat3.str(this);
  }
  // ===================
  // Instance methods
  // ===================
  /**
   * Copy the values from another {@link Mat3} into `this`.
   * @category Methods
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a) {
    this.set(a);
    return this;
  }
  /**
   * Set `this` to the identity matrix
   * Equivalent to Mat3.identity(this)
   * @category Methods
   *
   * @returns `this`
   */
  identity() {
    this.set(_Mat3.#IDENTITY_3X3);
    return this;
  }
  /**
   * Multiplies this {@link Mat3} against another one
   * Equivalent to `Mat3.multiply(this, this, b);`
   * @category Methods
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `this`
   */
  multiply(b) {
    return _Mat3.multiply(this, this, b);
  }
  /**
   * Alias for {@link Mat3.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Transpose this {@link Mat3}
   * Equivalent to `Mat3.transpose(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  transpose() {
    return _Mat3.transpose(this, this);
  }
  /**
   * Inverts this {@link Mat3}
   * Equivalent to `Mat4.invert(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  invert() {
    return _Mat3.invert(this, this);
  }
  /**
   * Translate this {@link Mat3} by the given vector
   * Equivalent to `Mat3.translate(this, this, v);`
   * @category Methods
   *
   * @param v - The {@link Vec2} to translate by
   * @returns `this`
   */
  translate(v) {
    return _Mat3.translate(this, this, v);
  }
  /**
   * Rotates this {@link Mat3} by the given angle around the given axis
   * Equivalent to `Mat3.rotate(this, this, rad);`
   * @category Methods
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotate(rad) {
    return _Mat3.rotate(this, this, rad);
  }
  /**
   * Scales this {@link Mat3} by the dimensions in the given vec3 not using vectorization
   * Equivalent to `Mat3.scale(this, this, v);`
   * @category Methods
   *
   * @param v - The {@link Vec2} to scale the matrix by
   * @returns `this`
   */
  scale(v) {
    return _Mat3.scale(this, this, v);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Mat3}.
   */
  static get BYTE_LENGTH() {
    return 9 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, identity {@link Mat3}
   * @category Static
   *
   * @returns A new {@link Mat3}
   */
  static create() {
    return new _Mat3();
  }
  /**
   * Creates a new {@link Mat3} initialized with values from an existing matrix
   * @category Static
   *
   * @param a - Matrix to clone
   * @returns A new {@link Mat3}
   */
  static clone(a) {
    return new _Mat3(a);
  }
  /**
   * Copy the values from one {@link Mat3} to another
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - Matrix to copy
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  /**
   * Create a new {@link Mat3} with the given values
   * @category Static
   *
   * @param values - Matrix components
   * @returns A new {@link Mat3}
   */
  static fromValues(...values) {
    return new _Mat3(...values);
  }
  /**
   * Set the components of a {@link Mat3} to the given values
   * @category Static
   *
   * @param out - The receiving matrix
   * @param values - Matrix components
   * @returns `out`
   */
  static set(out, ...values) {
    out[0] = values[0];
    out[1] = values[1];
    out[2] = values[2];
    out[3] = values[3];
    out[4] = values[4];
    out[5] = values[5];
    out[6] = values[6];
    out[7] = values[7];
    out[8] = values[8];
    return out;
  }
  /**
   * Set a {@link Mat3} to the identity matrix
   * @category Static
   *
   * @param out - The receiving matrix
   * @returns `out`
   */
  static identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  /**
   * Transpose the values of a {@link Mat3}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static transpose(out, a) {
    if (out === a) {
      const a01 = a[1], a02 = a[2], a12 = a[5];
      out[1] = a[3];
      out[2] = a[6];
      out[3] = a01;
      out[5] = a[7];
      out[6] = a02;
      out[7] = a12;
    } else {
      out[0] = a[0];
      out[1] = a[3];
      out[2] = a[6];
      out[3] = a[1];
      out[4] = a[4];
      out[5] = a[7];
      out[6] = a[2];
      out[7] = a[5];
      out[8] = a[8];
    }
    return out;
  }
  /**
   * Inverts a {@link Mat3}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out` or `null` if the matrix is not invertible
   */
  static invert(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2];
    const a10 = a[3], a11 = a[4], a12 = a[5];
    const a20 = a[6], a21 = a[7], a22 = a[8];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = b01 * det;
    out[1] = (-a22 * a01 + a02 * a21) * det;
    out[2] = (a12 * a01 - a02 * a11) * det;
    out[3] = b11 * det;
    out[4] = (a22 * a00 - a02 * a20) * det;
    out[5] = (-a12 * a00 + a02 * a10) * det;
    out[6] = b21 * det;
    out[7] = (-a21 * a00 + a01 * a20) * det;
    out[8] = (a11 * a00 - a01 * a10) * det;
    return out;
  }
  /**
   * Calculates the adjugate of a {@link Mat3}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static adjoint(out, a) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    out[0] = a11 * a22 - a12 * a21;
    out[1] = a02 * a21 - a01 * a22;
    out[2] = a01 * a12 - a02 * a11;
    out[3] = a12 * a20 - a10 * a22;
    out[4] = a00 * a22 - a02 * a20;
    out[5] = a02 * a10 - a00 * a12;
    out[6] = a10 * a21 - a11 * a20;
    out[7] = a01 * a20 - a00 * a21;
    out[8] = a00 * a11 - a01 * a10;
    return out;
  }
  /**
   * Calculates the determinant of a {@link Mat3}
   * @category Static
   *
   * @param a - the source matrix
   * @returns determinant of a
   */
  static determinant(a) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
  }
  /**
   * Adds two {@link Mat3}'s
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    return out;
  }
  /**
   * Subtracts matrix b from matrix a
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    return out;
  }
  /**
   * Alias for {@link Mat3.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return out;
  }
  /**
   * Multiplies two {@link Mat3}s
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    let b0 = b[0];
    let b1 = b[1];
    let b2 = b[2];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22;
    b0 = b[3];
    b1 = b[4];
    b2 = b[5];
    out[3] = b0 * a00 + b1 * a10 + b2 * a20;
    out[4] = b0 * a01 + b1 * a11 + b2 * a21;
    out[5] = b0 * a02 + b1 * a12 + b2 * a22;
    b0 = b[6];
    b1 = b[7];
    b2 = b[8];
    out[6] = b0 * a00 + b1 * a10 + b2 * a20;
    out[7] = b0 * a01 + b1 * a11 + b2 * a21;
    out[8] = b0 * a02 + b1 * a12 + b2 * a22;
    return out;
  }
  /**
   * Alias for {@link Mat3.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Translate a {@link Mat3} by the given vector
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to translate
   * @param v - vector to translate by
   * @returns `out`
   */
  static translate(out, a, v) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    const x = v[0];
    const y = v[1];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a10;
    out[4] = a11;
    out[5] = a12;
    out[6] = x * a00 + y * a10 + a20;
    out[7] = x * a01 + y * a11 + a21;
    out[8] = x * a02 + y * a12 + a22;
    return out;
  }
  /**
   * Rotates a {@link Mat3} by the given angle
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotate(out, a, rad) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a10 = a[3];
    const a11 = a[4];
    const a12 = a[5];
    const a20 = a[6];
    const a21 = a[7];
    const a22 = a[8];
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = c * a00 + s * a10;
    out[1] = c * a01 + s * a11;
    out[2] = c * a02 + s * a12;
    out[3] = c * a10 - s * a00;
    out[4] = c * a11 - s * a01;
    out[5] = c * a12 - s * a02;
    out[6] = a20;
    out[7] = a21;
    out[8] = a22;
    return out;
  }
  /**
   * Scales the {@link Mat3} by the dimensions in the given {@link Vec2}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param v - the {@link Vec2} to scale the matrix by
   * @returns `out`
   **/
  static scale(out, a, v) {
    const x = v[0];
    const y = v[1];
    out[0] = x * a[0];
    out[1] = x * a[1];
    out[2] = x * a[2];
    out[3] = y * a[3];
    out[4] = y * a[4];
    out[5] = y * a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    return out;
  }
  /**
   * Creates a {@link Mat3} from a vector translation
   * This is equivalent to (but much faster than):
   * ```js
   *   mat3.identity(dest);
   *   mat3.translate(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat3} receiving operation result
   * @param v - Translation vector
   * @returns `out`
   */
  static fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 1;
    out[5] = 0;
    out[6] = v[0];
    out[7] = v[1];
    out[8] = 1;
    return out;
  }
  /**
   * Creates a {@link Mat3} from a given angle around a given axis
   * This is equivalent to (but much faster than):
   *
   *     mat3.identity(dest);
   *     mat3.rotate(dest, dest, rad);
   * @category Static
   *
   * @param out - {@link Mat3} receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromRotation(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = -s;
    out[4] = c;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  /**
   * Creates a {@link Mat3} from a vector scaling
   * This is equivalent to (but much faster than):
   * ```js
   *   mat3.identity(dest);
   *   mat3.scale(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat3} receiving operation result
   * @param v - Scaling vector
   * @returns `out`
   */
  static fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = v[1];
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 1;
    return out;
  }
  /**
   * Copies the upper-left 3x3 values of a {@link Mat2d} into the given
   * {@link Mat3}.
   * @category Static
   *
   * @param out - the receiving 3x3 matrix
   * @param a - the source 2x3 matrix
   * @returns `out`
   */
  static fromMat2d(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = 0;
    out[3] = a[2];
    out[4] = a[3];
    out[5] = 0;
    out[6] = a[4];
    out[7] = a[5];
    out[8] = 1;
    return out;
  }
  /**
   * Calculates a {@link Mat3} from the given quaternion
   * @category Static
   *
   * @param out - {@link Mat3} receiving operation result
   * @param q - {@link Quat} to create matrix from
   * @returns `out`
   */
  static fromQuat(out, q) {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const yx = y * x2;
    const yy = y * y2;
    const zx = z * x2;
    const zy = z * y2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    out[0] = 1 - yy - zz;
    out[3] = yx - wz;
    out[6] = zx + wy;
    out[1] = yx + wz;
    out[4] = 1 - xx - zz;
    out[7] = zy - wx;
    out[2] = zx - wy;
    out[5] = zy + wx;
    out[8] = 1 - xx - yy;
    return out;
  }
  /**
   * Copies the upper-left 3x3 values of a {@link Mat4} into the given
   * {@link Mat3}.
   * @category Static
   *
   * @param out - the receiving 3x3 matrix
   * @param a - the source 4x4 matrix
   * @returns `out`
   */
  static fromMat4(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[4];
    out[4] = a[5];
    out[5] = a[6];
    out[6] = a[8];
    out[7] = a[9];
    out[8] = a[10];
    return out;
  }
  /**
   * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
   * @category Static
   *
   * @param {mat3} out mat3 receiving operation result
   * @param {ReadonlyMat4} a Mat4 to derive the normal matrix from
   * @returns `out` or `null` if the matrix is not invertible
   */
  static normalFromMat4(out, a) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[4] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[5] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[6] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[7] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[8] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    return out;
  }
  /**
   * Calculates a {@link Mat3} normal matrix (transpose inverse) from a {@link Mat4}
   * This version omits the calculation of the constant factor (1/determinant), so
   * any normals transformed with it will need to be renormalized.
   * From https://stackoverflow.com/a/27616419/25968
   * @category Static
   *
   * @param out - Matrix receiving operation result
   * @param a - Mat4 to derive the normal matrix from
   * @returns `out`
   */
  static normalFromMat4Fast(out, a) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const bx = a[4];
    const by = a[5];
    const bz = a[6];
    const cx = a[8];
    const cy = a[9];
    const cz = a[10];
    out[0] = by * cz - cz * cy;
    out[1] = bz * cx - cx * cz;
    out[2] = bx * cy - cy * cx;
    out[3] = cy * az - cz * ay;
    out[4] = cz * ax - cx * az;
    out[5] = cx * ay - cy * ax;
    out[6] = ay * bz - az * by;
    out[7] = az * bx - ax * bz;
    out[8] = ax * by - ay * bx;
    return out;
  }
  /**
   * Generates a 2D projection matrix with the given bounds
   * @category Static
   *
   * @param out mat3 frustum matrix will be written into
   * @param width Width of your gl context
   * @param height Height of gl context
   * @returns `out`
   */
  static projection(out, width, height) {
    out[0] = 2 / width;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = -2 / height;
    out[5] = 0;
    out[6] = -1;
    out[7] = 1;
    out[8] = 1;
    return out;
  }
  /**
   * Returns Frobenius norm of a {@link Mat3}
   * @category Static
   *
   * @param a - the matrix to calculate Frobenius norm of
   * @returns Frobenius norm
   */
  static frob(a) {
    return Math.sqrt(
      a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + a[6] * a[6] + a[7] * a[7] + a[8] * a[8]
    );
  }
  /**
   * Multiply each element of a {@link Mat3} by a scalar.
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param b - amount to scale the matrix's elements by
   * @returns `out`
   */
  static multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    return out;
  }
  /**
   * Adds two {@link Mat3}'s after multiplying each element of the second operand by a scalar value.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b's elements by before adding
   * @returns `out`
   */
  static multiplyScalarAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    out[3] = a[3] + b[3] * scale;
    out[4] = a[4] + b[4] * scale;
    out[5] = a[5] + b[5] * scale;
    out[6] = a[6] + b[6] * scale;
    out[7] = a[7] + b[7] * scale;
    out[8] = a[8] + b[8] * scale;
    return out;
  }
  /**
   * Returns whether two {@link Mat3}s have exactly the same elements in the same position (when compared with ===).
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8];
  }
  /**
   * Returns whether two {@link Mat3}s have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const a6 = a[6];
    const a7 = a[7];
    const a8 = a[8];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    const b4 = b[4];
    const b5 = b[5];
    const b6 = b[6];
    const b7 = b[7];
    const b8 = b[8];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= GLM_EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= GLM_EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= GLM_EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= GLM_EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= GLM_EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= GLM_EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8));
  }
  /**
   * Returns a string representation of a {@link Mat3}
   * @category Static
   *
   * @param a - matrix to represent as a string
   * @returns string representation of the matrix
   */
  static str(a) {
    return `Mat3(${a.join(", ")})`;
  }
};
Mat3.prototype.mul = Mat3.prototype.multiply;
Mat3.mul = Mat3.multiply;
Mat3.sub = Mat3.subtract;
var Mat4 = class _Mat4 extends Float32Array {
  static #IDENTITY_4X4 = new Float32Array([
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  ]);
  /**
   * Temporary variable to prevent repeated allocations in the algorithms within Mat4.
   * These are declared as TypedArrays to aid in tree-shaking.
   */
  static #TMP_VEC3 = new Float32Array(3);
  /**
   * Create a {@link Mat4}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 16:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 16);
        break;
      case 1:
        const v = values[0];
        if (typeof v === "number") {
          super([
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v,
            v
          ]);
        } else {
          super(v, 0, 16);
        }
        break;
      default:
        super(_Mat4.#IDENTITY_4X4);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  /**
   * A string representation of `this`
   * Equivalent to `Mat4.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Mat4.str(this);
  }
  // ===================
  // Instance methods
  // ===================
  /**
   * Copy the values from another {@link Mat4} into `this`.
   * @category Methods
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a) {
    this.set(a);
    return this;
  }
  /**
   * Set `this` to the identity matrix
   * Equivalent to Mat4.identity(this)
   * @category Methods
   *
   * @returns `this`
   */
  identity() {
    this.set(_Mat4.#IDENTITY_4X4);
    return this;
  }
  /**
   * Multiplies this {@link Mat4} against another one
   * Equivalent to `Mat4.multiply(this, this, b);`
   * @category Methods
   *
   * @param b - The second operand
   * @returns `this`
   */
  multiply(b) {
    return _Mat4.multiply(this, this, b);
  }
  /**
   * Alias for {@link Mat4.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Transpose this {@link Mat4}
   * Equivalent to `Mat4.transpose(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  transpose() {
    return _Mat4.transpose(this, this);
  }
  /**
   * Inverts this {@link Mat4}
   * Equivalent to `Mat4.invert(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  invert() {
    return _Mat4.invert(this, this);
  }
  /**
   * Translate this {@link Mat4} by the given vector
   * Equivalent to `Mat4.translate(this, this, v);`
   * @category Methods
   *
   * @param v - The {@link Vec3} to translate by
   * @returns `this`
   */
  translate(v) {
    return _Mat4.translate(this, this, v);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the given axis
   * Equivalent to `Mat4.rotate(this, this, rad, axis);`
   * @category Methods
   *
   * @param rad - the angle to rotate the matrix by
   * @param axis - the axis to rotate around
   * @returns `this`
   */
  rotate(rad, axis) {
    return _Mat4.rotate(this, this, rad, axis);
  }
  /**
   * Scales this {@link Mat4} by the dimensions in the given vec3 not using vectorization
   * Equivalent to `Mat4.scale(this, this, v);`
   * @category Methods
   *
   * @param v - The {@link Vec3} to scale the matrix by
   * @returns `this`
   */
  scale(v) {
    return _Mat4.scale(this, this, v);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the X axis
   * Equivalent to `Mat4.rotateX(this, this, rad);`
   * @category Methods
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotateX(rad) {
    return _Mat4.rotateX(this, this, rad);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the Y axis
   * Equivalent to `Mat4.rotateY(this, this, rad);`
   * @category Methods
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotateY(rad) {
    return _Mat4.rotateY(this, this, rad);
  }
  /**
   * Rotates this {@link Mat4} by the given angle around the Z axis
   * Equivalent to `Mat4.rotateZ(this, this, rad);`
   * @category Methods
   *
   * @param rad - the angle to rotate the matrix by
   * @returns `this`
   */
  rotateZ(rad) {
    return _Mat4.rotateZ(this, this, rad);
  }
  /**
   * Generates a perspective projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * Equivalent to `Mat4.perspectiveNO(this, fovy, aspect, near, far);`
   * @category Methods
   *
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `this`
   */
  perspectiveNO(fovy, aspect, near, far) {
    return _Mat4.perspectiveNO(this, fovy, aspect, near, far);
  }
  /**
   * Generates a perspective projection matrix suitable for WebGPU with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * Equivalent to `Mat4.perspectiveZO(this, fovy, aspect, near, far);`
   * @category Methods
   *
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `this`
   */
  perspectiveZO(fovy, aspect, near, far) {
    return _Mat4.perspectiveZO(this, fovy, aspect, near, far);
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Equivalent to `Mat4.orthoNO(this, left, right, bottom, top, near, far);`
   * @category Methods
   *
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `this`
   */
  orthoNO(left, right, bottom, top, near, far) {
    return _Mat4.orthoNO(this, left, right, bottom, top, near, far);
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Equivalent to `Mat4.orthoZO(this, left, right, bottom, top, near, far);`
   * @category Methods
   *
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `this`
   */
  orthoZO(left, right, bottom, top, near, far) {
    return _Mat4.orthoZO(this, left, right, bottom, top, near, far);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Mat4}.
   */
  static get BYTE_LENGTH() {
    return 16 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, identity {@link Mat4}
   * @category Static
   *
   * @returns A new {@link Mat4}
   */
  static create() {
    return new _Mat4();
  }
  /**
   * Creates a new {@link Mat4} initialized with values from an existing matrix
   * @category Static
   *
   * @param a - Matrix to clone
   * @returns A new {@link Mat4}
   */
  static clone(a) {
    return new _Mat4(a);
  }
  /**
   * Copy the values from one {@link Mat4} to another
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - Matrix to copy
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  /**
   * Create a new mat4 with the given values
   * @category Static
   *
   * @param values - Matrix components
   * @returns A new {@link Mat4}
   */
  static fromValues(...values) {
    return new _Mat4(...values);
  }
  /**
   * Set the components of a mat4 to the given values
   * @category Static
   *
   * @param out - The receiving matrix
   * @param values - Matrix components
   * @returns `out`
   */
  static set(out, ...values) {
    out[0] = values[0];
    out[1] = values[1];
    out[2] = values[2];
    out[3] = values[3];
    out[4] = values[4];
    out[5] = values[5];
    out[6] = values[6];
    out[7] = values[7];
    out[8] = values[8];
    out[9] = values[9];
    out[10] = values[10];
    out[11] = values[11];
    out[12] = values[12];
    out[13] = values[13];
    out[14] = values[14];
    out[15] = values[15];
    return out;
  }
  /**
   * Set a {@link Mat4} to the identity matrix
   * @category Static
   *
   * @param out - The receiving Matrix
   * @returns `out`
   */
  static identity(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Transpose the values of a {@link Mat4}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static transpose(out, a) {
    if (out === a) {
      const a01 = a[1], a02 = a[2], a03 = a[3];
      const a12 = a[6], a13 = a[7];
      const a23 = a[11];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a01;
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a02;
      out[9] = a12;
      out[11] = a[14];
      out[12] = a03;
      out[13] = a13;
      out[14] = a23;
    } else {
      out[0] = a[0];
      out[1] = a[4];
      out[2] = a[8];
      out[3] = a[12];
      out[4] = a[1];
      out[5] = a[5];
      out[6] = a[9];
      out[7] = a[13];
      out[8] = a[2];
      out[9] = a[6];
      out[10] = a[10];
      out[11] = a[14];
      out[12] = a[3];
      out[13] = a[7];
      out[14] = a[11];
      out[15] = a[15];
    }
    return out;
  }
  /**
   * Inverts a {@link Mat4}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out` or `null` if the matrix is not invertible
   */
  static invert(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  }
  /**
   * Calculates the adjugate of a {@link Mat4}
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the source matrix
   * @returns `out`
   */
  static adjoint(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    out[0] = a11 * b11 - a12 * b10 + a13 * b09;
    out[1] = a02 * b10 - a01 * b11 - a03 * b09;
    out[2] = a31 * b05 - a32 * b04 + a33 * b03;
    out[3] = a22 * b04 - a21 * b05 - a23 * b03;
    out[4] = a12 * b08 - a10 * b11 - a13 * b07;
    out[5] = a00 * b11 - a02 * b08 + a03 * b07;
    out[6] = a32 * b02 - a30 * b05 - a33 * b01;
    out[7] = a20 * b05 - a22 * b02 + a23 * b01;
    out[8] = a10 * b10 - a11 * b08 + a13 * b06;
    out[9] = a01 * b08 - a00 * b10 - a03 * b06;
    out[10] = a30 * b04 - a31 * b02 + a33 * b00;
    out[11] = a21 * b02 - a20 * b04 - a23 * b00;
    out[12] = a11 * b07 - a10 * b09 - a12 * b06;
    out[13] = a00 * b09 - a01 * b07 + a02 * b06;
    out[14] = a31 * b01 - a30 * b03 - a32 * b00;
    out[15] = a20 * b03 - a21 * b01 + a22 * b00;
    return out;
  }
  /**
   * Calculates the determinant of a {@link Mat4}
   * @category Static
   *
   * @param a - the source matrix
   * @returns determinant of a
   */
  static determinant(a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b0 = a00 * a11 - a01 * a10;
    const b1 = a00 * a12 - a02 * a10;
    const b2 = a01 * a12 - a02 * a11;
    const b3 = a20 * a31 - a21 * a30;
    const b4 = a20 * a32 - a22 * a30;
    const b5 = a21 * a32 - a22 * a31;
    const b6 = a00 * b5 - a01 * b4 + a02 * b3;
    const b7 = a10 * b5 - a11 * b4 + a12 * b3;
    const b8 = a20 * b2 - a21 * b1 + a22 * b0;
    const b9 = a30 * b2 - a31 * b1 + a32 * b0;
    return a13 * b6 - a03 * b7 + a33 * b8 - a23 * b9;
  }
  /**
   * Multiplies two {@link Mat4}s
   * @category Static
   *
   * @param out - The receiving Matrix
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    let b0 = b[0];
    let b1 = b[1];
    let b2 = b[2];
    let b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }
  /**
   * Alias for {@link Mat4.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Translate a {@link Mat4} by the given vector
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to translate
   * @param v - vector to translate by
   * @returns `out`
   */
  static translate(out, a, v) {
    const x = v[0];
    const y = v[1];
    const z = v[2];
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      const a00 = a[0];
      const a01 = a[1];
      const a02 = a[2];
      const a03 = a[3];
      const a10 = a[4];
      const a11 = a[5];
      const a12 = a[6];
      const a13 = a[7];
      const a20 = a[8];
      const a21 = a[9];
      const a22 = a[10];
      const a23 = a[11];
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
    return out;
  }
  /**
   * Scales the {@link Mat4} by the dimensions in the given {@link Vec3} not using vectorization
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param v - the {@link Vec3} to scale the matrix by
   * @returns `out`
   **/
  static scale(out, a, v) {
    const x = v[0];
    const y = v[1];
    const z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
  }
  /**
   * Rotates a {@link Mat4} by the given angle around the given axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @param axis - the axis to rotate around
   * @returns `out` or `null` if axis has a length of 0
   */
  static rotate(out, a, rad, axis) {
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x * x + y * y + z * z);
    if (len < GLM_EPSILON) {
      return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const b00 = x * x * t + c;
    const b01 = y * x * t + z * s;
    const b02 = z * x * t - y * s;
    const b10 = x * y * t - z * s;
    const b11 = y * y * t + c;
    const b12 = z * y * t + x * s;
    const b20 = x * z * t + y * s;
    const b21 = y * z * t - x * s;
    const b22 = z * z * t + c;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    return out;
  }
  /**
   * Rotates a matrix by the given angle around the X axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotateX(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    if (a !== out) {
      out[0] = a[0];
      out[1] = a[1];
      out[2] = a[2];
      out[3] = a[3];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[4] = a10 * c + a20 * s;
    out[5] = a11 * c + a21 * s;
    out[6] = a12 * c + a22 * s;
    out[7] = a13 * c + a23 * s;
    out[8] = a20 * c - a10 * s;
    out[9] = a21 * c - a11 * s;
    out[10] = a22 * c - a12 * s;
    out[11] = a23 * c - a13 * s;
    return out;
  }
  /**
   * Rotates a matrix by the given angle around the Y axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotateY(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    if (a !== out) {
      out[4] = a[4];
      out[5] = a[5];
      out[6] = a[6];
      out[7] = a[7];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c - a20 * s;
    out[1] = a01 * c - a21 * s;
    out[2] = a02 * c - a22 * s;
    out[3] = a03 * c - a23 * s;
    out[8] = a00 * s + a20 * c;
    out[9] = a01 * s + a21 * c;
    out[10] = a02 * s + a22 * c;
    out[11] = a03 * s + a23 * c;
    return out;
  }
  /**
   * Rotates a matrix by the given angle around the Z axis
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to rotate
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static rotateZ(out, a, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    if (a !== out) {
      out[8] = a[8];
      out[9] = a[9];
      out[10] = a[10];
      out[11] = a[11];
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }
    out[0] = a00 * c + a10 * s;
    out[1] = a01 * c + a11 * s;
    out[2] = a02 * c + a12 * s;
    out[3] = a03 * c + a13 * s;
    out[4] = a10 * c - a00 * s;
    out[5] = a11 * c - a01 * s;
    out[6] = a12 * c - a02 * s;
    out[7] = a13 * c - a03 * s;
    return out;
  }
  /**
   * Creates a {@link Mat4} from a vector translation
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.translate(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat4} receiving operation result
   * @param v - Translation vector
   * @returns `out`
   */
  static fromTranslation(out, v) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  /**
   * Creates a {@link Mat4} from a vector scaling
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.scale(dest, dest, vec);
   * ```
   * @category Static
   *
   * @param out - {@link Mat4} receiving operation result
   * @param v - Scaling vector
   * @returns `out`
   */
  static fromScaling(out, v) {
    out[0] = v[0];
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = v[1];
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = v[2];
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a {@link Mat4} from a given angle around a given axis
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.rotate(dest, dest, rad, axis);
   * ```
   * @category Static
   *
   * @param out - {@link Mat4} receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @param axis - the axis to rotate around
   * @returns `out` or `null` if `axis` has a length of 0
   */
  static fromRotation(out, rad, axis) {
    let x = axis[0];
    let y = axis[1];
    let z = axis[2];
    let len = Math.sqrt(x * x + y * y + z * z);
    if (len < GLM_EPSILON) {
      return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    const t = 1 - c;
    out[0] = x * x * t + c;
    out[1] = y * x * t + z * s;
    out[2] = z * x * t - y * s;
    out[3] = 0;
    out[4] = x * y * t - z * s;
    out[5] = y * y * t + c;
    out[6] = z * y * t + x * s;
    out[7] = 0;
    out[8] = x * z * t + y * s;
    out[9] = y * z * t - x * s;
    out[10] = z * z * t + c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from the given angle around the X axis
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.rotateX(dest, dest, rad);
   * ```
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromXRotation(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = c;
    out[6] = s;
    out[7] = 0;
    out[8] = 0;
    out[9] = -s;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from the given angle around the Y axis
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.rotateY(dest, dest, rad);
   * ```
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromYRotation(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = c;
    out[1] = 0;
    out[2] = -s;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = s;
    out[9] = 0;
    out[10] = c;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from the given angle around the Z axis
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.rotateZ(dest, dest, rad);
   * ```
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param rad - the angle to rotate the matrix by
   * @returns `out`
   */
  static fromZRotation(out, rad) {
    const s = Math.sin(rad);
    const c = Math.cos(rad);
    out[0] = c;
    out[1] = s;
    out[2] = 0;
    out[3] = 0;
    out[4] = -s;
    out[5] = c;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from a quaternion rotation and vector translation
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.translate(dest, vec);
   *   let quatMat = mat4.create();
   *   quat4.toMat4(quat, quatMat);
   *   mat4.multiply(dest, quatMat);
   * ```
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Rotation quaternion
   * @param v - Translation vector
   * @returns `out`
   */
  static fromRotationTranslation(out, q, v) {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    out[0] = 1 - (yy + zz);
    out[1] = xy + wz;
    out[2] = xz - wy;
    out[3] = 0;
    out[4] = xy - wz;
    out[5] = 1 - (xx + zz);
    out[6] = yz + wx;
    out[7] = 0;
    out[8] = xz + wy;
    out[9] = yz - wx;
    out[10] = 1 - (xx + yy);
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  /**
   * Sets a {@link Mat4} from a {@link Quat2}.
   * @category Static
   *
   * @param out - Matrix
   * @param a - Dual Quaternion
   * @returns `out`
   */
  static fromQuat2(out, a) {
    const bx = -a[0];
    const by = -a[1];
    const bz = -a[2];
    const bw = a[3];
    const ax = a[4];
    const ay = a[5];
    const az = a[6];
    const aw = a[7];
    const magnitude = bx * bx + by * by + bz * bz + bw * bw;
    if (magnitude > 0) {
      _Mat4.#TMP_VEC3[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2 / magnitude;
      _Mat4.#TMP_VEC3[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2 / magnitude;
      _Mat4.#TMP_VEC3[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2 / magnitude;
    } else {
      _Mat4.#TMP_VEC3[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
      _Mat4.#TMP_VEC3[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
      _Mat4.#TMP_VEC3[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    }
    _Mat4.fromRotationTranslation(out, a, _Mat4.#TMP_VEC3);
    return out;
  }
  /**
   * Calculates a {@link Mat4} normal matrix (transpose inverse) from a {@link Mat4}
   * @category Static
   *
   * @param out - Matrix receiving operation result
   * @param a - Mat4 to derive the normal matrix from
   * @returns `out` or `null` if the matrix is not invertible
   */
  static normalFromMat4(out, a) {
    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4];
    const a11 = a[5];
    const a12 = a[6];
    const a13 = a[7];
    const a20 = a[8];
    const a21 = a[9];
    const a22 = a[10];
    const a23 = a[11];
    const a30 = a[12];
    const a31 = a[13];
    const a32 = a[14];
    const a33 = a[15];
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) {
      return null;
    }
    det = 1 / det;
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[3] = 0;
    out[4] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[7] = 0;
    out[8] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[9] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Calculates a {@link Mat4} normal matrix (transpose inverse) from a {@link Mat4}
   * This version omits the calculation of the constant factor (1/determinant), so
   * any normals transformed with it will need to be renormalized.
   * From https://stackoverflow.com/a/27616419/25968
   * @category Static
   *
   * @param out - Matrix receiving operation result
   * @param a - Mat4 to derive the normal matrix from
   * @returns `out`
   */
  static normalFromMat4Fast(out, a) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const bx = a[4];
    const by = a[5];
    const bz = a[6];
    const cx = a[8];
    const cy = a[9];
    const cz = a[10];
    out[0] = by * cz - cz * cy;
    out[1] = bz * cx - cx * cz;
    out[2] = bx * cy - cy * cx;
    out[3] = 0;
    out[4] = cy * az - cz * ay;
    out[5] = cz * ax - cx * az;
    out[6] = cx * ay - cy * ax;
    out[7] = 0;
    out[8] = ay * bz - az * by;
    out[9] = az * bx - ax * bz;
    out[10] = ax * by - ay * bx;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Returns the translation vector component of a transformation
   * matrix. If a matrix is built with fromRotationTranslation,
   * the returned vector will be the same as the translation vector
   * originally supplied.
   * @category Static
   *
   * @param  {vec3} out Vector to receive translation component
   * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {vec3} out
   */
  static getTranslation(out, mat) {
    out[0] = mat[12];
    out[1] = mat[13];
    out[2] = mat[14];
    return out;
  }
  /**
   * Returns the scaling factor component of a transformation
   * matrix. If a matrix is built with fromRotationTranslationScale
   * with a normalized Quaternion parameter, the returned vector will be
   * the same as the scaling vector
   * originally supplied.
   * @category Static
   *
   * @param  {vec3} out Vector to receive scaling factor component
   * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {vec3} out
   */
  static getScaling(out, mat) {
    const m11 = mat[0];
    const m12 = mat[1];
    const m13 = mat[2];
    const m21 = mat[4];
    const m22 = mat[5];
    const m23 = mat[6];
    const m31 = mat[8];
    const m32 = mat[9];
    const m33 = mat[10];
    out[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
    return out;
  }
  /**
   * Returns a quaternion representing the rotational component
   * of a transformation matrix. If a matrix is built with
   * fromRotationTranslation, the returned quaternion will be the
   * same as the quaternion originally supplied.
   * @category Static
   *
   * @param out - Quaternion to receive the rotation component
   * @param mat - Matrix to be decomposed (input)
   * @return `out`
   */
  static getRotation(out, mat) {
    _Mat4.getScaling(_Mat4.#TMP_VEC3, mat);
    const is1 = 1 / _Mat4.#TMP_VEC3[0];
    const is2 = 1 / _Mat4.#TMP_VEC3[1];
    const is3 = 1 / _Mat4.#TMP_VEC3[2];
    const sm11 = mat[0] * is1;
    const sm12 = mat[1] * is2;
    const sm13 = mat[2] * is3;
    const sm21 = mat[4] * is1;
    const sm22 = mat[5] * is2;
    const sm23 = mat[6] * is3;
    const sm31 = mat[8] * is1;
    const sm32 = mat[9] * is2;
    const sm33 = mat[10] * is3;
    const trace = sm11 + sm22 + sm33;
    let S = 0;
    if (trace > 0) {
      S = Math.sqrt(trace + 1) * 2;
      out[3] = 0.25 * S;
      out[0] = (sm23 - sm32) / S;
      out[1] = (sm31 - sm13) / S;
      out[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out[3] = (sm23 - sm32) / S;
      out[0] = 0.25 * S;
      out[1] = (sm12 + sm21) / S;
      out[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
      S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out[3] = (sm31 - sm13) / S;
      out[0] = (sm12 + sm21) / S;
      out[1] = 0.25 * S;
      out[2] = (sm23 + sm32) / S;
    } else {
      S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out[3] = (sm12 - sm21) / S;
      out[0] = (sm31 + sm13) / S;
      out[1] = (sm23 + sm32) / S;
      out[2] = 0.25 * S;
    }
    return out;
  }
  /**
   * Decomposes a transformation matrix into its rotation, translation
   * and scale components. Returns only the rotation component
   * @category Static
   *
   * @param out_r - Quaternion to receive the rotation component
   * @param out_t - Vector to receive the translation vector
   * @param out_s - Vector to receive the scaling factor
   * @param mat - Matrix to be decomposed (input)
   * @returns `out_r`
   */
  static decompose(out_r, out_t, out_s, mat) {
    out_t[0] = mat[12];
    out_t[1] = mat[13];
    out_t[2] = mat[14];
    const m11 = mat[0];
    const m12 = mat[1];
    const m13 = mat[2];
    const m21 = mat[4];
    const m22 = mat[5];
    const m23 = mat[6];
    const m31 = mat[8];
    const m32 = mat[9];
    const m33 = mat[10];
    out_s[0] = Math.sqrt(m11 * m11 + m12 * m12 + m13 * m13);
    out_s[1] = Math.sqrt(m21 * m21 + m22 * m22 + m23 * m23);
    out_s[2] = Math.sqrt(m31 * m31 + m32 * m32 + m33 * m33);
    const is1 = 1 / out_s[0];
    const is2 = 1 / out_s[1];
    const is3 = 1 / out_s[2];
    const sm11 = m11 * is1;
    const sm12 = m12 * is2;
    const sm13 = m13 * is3;
    const sm21 = m21 * is1;
    const sm22 = m22 * is2;
    const sm23 = m23 * is3;
    const sm31 = m31 * is1;
    const sm32 = m32 * is2;
    const sm33 = m33 * is3;
    const trace = sm11 + sm22 + sm33;
    let S = 0;
    if (trace > 0) {
      S = Math.sqrt(trace + 1) * 2;
      out_r[3] = 0.25 * S;
      out_r[0] = (sm23 - sm32) / S;
      out_r[1] = (sm31 - sm13) / S;
      out_r[2] = (sm12 - sm21) / S;
    } else if (sm11 > sm22 && sm11 > sm33) {
      S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      out_r[3] = (sm23 - sm32) / S;
      out_r[0] = 0.25 * S;
      out_r[1] = (sm12 + sm21) / S;
      out_r[2] = (sm31 + sm13) / S;
    } else if (sm22 > sm33) {
      S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      out_r[3] = (sm31 - sm13) / S;
      out_r[0] = (sm12 + sm21) / S;
      out_r[1] = 0.25 * S;
      out_r[2] = (sm23 + sm32) / S;
    } else {
      S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      out_r[3] = (sm12 - sm21) / S;
      out_r[0] = (sm31 + sm13) / S;
      out_r[1] = (sm23 + sm32) / S;
      out_r[2] = 0.25 * S;
    }
    return out_r;
  }
  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale
   * This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.translate(dest, vec);
   *   let quatMat = mat4.create();
   *   quat4.toMat4(quat, quatMat);
   *   mat4.multiply(dest, quatMat);
   *   mat4.scale(dest, scale);
   * ```
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Rotation quaternion
   * @param v - Translation vector
   * @param s - Scaling vector
   * @returns `out`
   */
  static fromRotationTranslationScale(out, q, v, s) {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = s[0];
    const sy = s[1];
    const sz = s[2];
    out[0] = (1 - (yy + zz)) * sx;
    out[1] = (xy + wz) * sx;
    out[2] = (xz - wy) * sx;
    out[3] = 0;
    out[4] = (xy - wz) * sy;
    out[5] = (1 - (xx + zz)) * sy;
    out[6] = (yz + wx) * sy;
    out[7] = 0;
    out[8] = (xz + wy) * sz;
    out[9] = (yz - wx) * sz;
    out[10] = (1 - (xx + yy)) * sz;
    out[11] = 0;
    out[12] = v[0];
    out[13] = v[1];
    out[14] = v[2];
    out[15] = 1;
    return out;
  }
  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the
   * given origin. This is equivalent to (but much faster than):
   * ```js
   *   mat4.identity(dest);
   *   mat4.translate(dest, vec);
   *   mat4.translate(dest, origin);
   *   let quatMat = mat4.create();
   *   quat4.toMat4(quat, quatMat);
   *   mat4.multiply(dest, quatMat);
   *   mat4.scale(dest, scale)
   *   mat4.translate(dest, negativeOrigin);
   * ```
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Rotation quaternion
   * @param v - Translation vector
   * @param s - Scaling vector
   * @param o - The origin vector around which to scale and rotate
   * @returns `out`
   */
  static fromRotationTranslationScaleOrigin(out, q, v, s, o) {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const xy = x * y2;
    const xz = x * z2;
    const yy = y * y2;
    const yz = y * z2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    const sx = s[0];
    const sy = s[1];
    const sz = s[2];
    const ox = o[0];
    const oy = o[1];
    const oz = o[2];
    const out0 = (1 - (yy + zz)) * sx;
    const out1 = (xy + wz) * sx;
    const out2 = (xz - wy) * sx;
    const out4 = (xy - wz) * sy;
    const out5 = (1 - (xx + zz)) * sy;
    const out6 = (yz + wx) * sy;
    const out8 = (xz + wy) * sz;
    const out9 = (yz - wx) * sz;
    const out10 = (1 - (xx + yy)) * sz;
    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = 0;
    out[4] = out4;
    out[5] = out5;
    out[6] = out6;
    out[7] = 0;
    out[8] = out8;
    out[9] = out9;
    out[10] = out10;
    out[11] = 0;
    out[12] = v[0] + ox - (out0 * ox + out4 * oy + out8 * oz);
    out[13] = v[1] + oy - (out1 * ox + out5 * oy + out9 * oz);
    out[14] = v[2] + oz - (out2 * ox + out6 * oy + out10 * oz);
    out[15] = 1;
    return out;
  }
  /**
   * Calculates a 4x4 matrix from the given quaternion
   * @category Static
   *
   * @param out - mat4 receiving operation result
   * @param q - Quaternion to create matrix from
   * @returns `out`
   */
  static fromQuat(out, q) {
    const x = q[0];
    const y = q[1];
    const z = q[2];
    const w = q[3];
    const x2 = x + x;
    const y2 = y + y;
    const z2 = z + z;
    const xx = x * x2;
    const yx = y * x2;
    const yy = y * y2;
    const zx = z * x2;
    const zy = z * y2;
    const zz = z * z2;
    const wx = w * x2;
    const wy = w * y2;
    const wz = w * z2;
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }
  /**
   * Generates a frustum matrix with the given bounds
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far -  Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static frustumNO(out, left, right, bottom, top, near, far = Infinity) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  /**
   * Alias for {@link Mat4.frustumNO}
   * @category Static
   * @deprecated Use {@link Mat4.frustumNO} or {@link Mat4.frustumZO} explicitly
   */
  static frustum(out, left, right, bottom, top, near, far = Infinity) {
    return out;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Generates a frustum matrix with the given bounds
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static frustumZO(out, left, right, bottom, top, near, far = Infinity) {
    const rl = 1 / (right - left);
    const tb = 1 / (top - bottom);
    out[0] = near * 2 * rl;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = near * 2 * tb;
    out[6] = 0;
    out[7] = 0;
    out[8] = (right + left) * rl;
    out[9] = (top + bottom) * tb;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  /**
   * Generates a perspective projection matrix with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
   * which matches WebGL/OpenGL's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static perspectiveNO(out, fovy, aspect, near, far = Infinity) {
    const f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }
    return out;
  }
  /**
   * Alias for {@link Mat4.perspectiveNO}
   * @category Static
   * @deprecated Use {@link Mat4.perspectiveNO} or {@link Mat4.perspectiveZO} explicitly
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static perspective(out, fovy, aspect, near, far = Infinity) {
    return out;
  }
  /**
   * Generates a perspective projection matrix suitable for WebGPU with the given bounds.
   * The near/far clip planes correspond to a normalized device coordinate Z range of [0, 1],
   * which matches WebGPU/Vulkan/DirectX/Metal's clip volume.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param fovy - Vertical field of view in radians
   * @param aspect - Aspect ratio. typically viewport width/height
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum, can be null or Infinity
   * @returns `out`
   */
  static perspectiveZO(out, fovy, aspect, near, far = Infinity) {
    const f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      out[10] = far * nf;
      out[14] = far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -near;
    }
    return out;
  }
  /**
   * Generates a perspective projection matrix with the given field of view. This is primarily useful for generating
   * projection matrices to be used with the still experimental WebVR API.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param fov - Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `out`
   * @deprecated
   */
  static perspectiveFromFieldOfView(out, fov, near, far) {
    const upTan = Math.tan(fov.upDegrees * Math.PI / 180);
    const downTan = Math.tan(fov.downDegrees * Math.PI / 180);
    const leftTan = Math.tan(fov.leftDegrees * Math.PI / 180);
    const rightTan = Math.tan(fov.rightDegrees * Math.PI / 180);
    const xScale = 2 / (leftTan + rightTan);
    const yScale = 2 / (upTan + downTan);
    out[0] = xScale;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = yScale;
    out[6] = 0;
    out[7] = 0;
    out[8] = -((leftTan - rightTan) * xScale * 0.5);
    out[9] = (upTan - downTan) * yScale * 0.5;
    out[10] = far / (near - far);
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = far * near / (near - far);
    out[15] = 0;
    return out;
  }
  /**
   * Generates an orthogonal projection matrix with the given bounds. The near / far clip planes correspond to a
   * normalized device coordinate Z range of [-1, 1], which matches WebGL / OpenGLs clip volume.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `out`
   */
  static orthoNO(out, left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  }
  /**
   * Alias for {@link Mat4.orthoNO}
   * @category Static
   * @deprecated Use {@link Mat4.orthoNO} or {@link Mat4.orthoZO} explicitly
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static ortho(out, left, right, bottom, top, near, far) {
    return out;
  }
  /**
   * Generates a orthogonal projection matrix with the given bounds. The near / far clip planes correspond to a
   * normalized device coordinate Z range of [0, 1], which matches WebGPU / Vulkan / DirectX / Metal's clip volume.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param left - Left bound of the frustum
   * @param right - Right bound of the frustum
   * @param bottom - Bottom bound of the frustum
   * @param top - Top bound of the frustum
   * @param near - Near bound of the frustum
   * @param far - Far bound of the frustum
   * @returns `out`
   */
  static orthoZO(out, left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return out;
  }
  /**
   * Generates a look-at matrix with the given eye position, focal point, and up axis. If you want a matrix that
   * actually makes an object look at another object, you should use targetTo instead.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param eye - Position of the viewer
   * @param center - Point the viewer is looking at
   * @param up - vec3 pointing up
   * @returns `out`
   */
  static lookAt(out, eye, center, up) {
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    const centerx = center[0];
    const centery = center[1];
    const centerz = center[2];
    if (Math.abs(eyex - centerx) < GLM_EPSILON && Math.abs(eyey - centery) < GLM_EPSILON && Math.abs(eyez - centerz) < GLM_EPSILON) {
      return _Mat4.identity(out);
    }
    let z0 = eyex - centerx;
    let z1 = eyey - centery;
    let z2 = eyez - centerz;
    let len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    let x0 = upy * z2 - upz * z1;
    let x1 = upz * z0 - upx * z2;
    let x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    let y0 = z1 * x2 - z2 * x1;
    let y1 = z2 * x0 - z0 * x2;
    let y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  }
  /**
   * Generates a matrix that makes something look at something else.
   * @category Static
   *
   * @param out - mat4 frustum matrix will be written into
   * @param eye - Position of the viewer
   * @param target - Point the viewer is looking at
   * @param up - vec3 pointing up
   * @returns `out`
   */
  static targetTo(out, eye, target, up) {
    const eyex = eye[0];
    const eyey = eye[1];
    const eyez = eye[2];
    const upx = up[0];
    const upy = up[1];
    const upz = up[2];
    let z0 = eyex - target[0];
    let z1 = eyey - target[1];
    let z2 = eyez - target[2];
    let len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    let x0 = upy * z2 - upz * z1;
    let x1 = upz * z0 - upx * z2;
    let x2 = upx * z1 - upy * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    out[0] = x0;
    out[1] = x1;
    out[2] = x2;
    out[3] = 0;
    out[4] = z1 * x2 - z2 * x1;
    out[5] = z2 * x0 - z0 * x2;
    out[6] = z0 * x1 - z1 * x0;
    out[7] = 0;
    out[8] = z0;
    out[9] = z1;
    out[10] = z2;
    out[11] = 0;
    out[12] = eyex;
    out[13] = eyey;
    out[14] = eyez;
    out[15] = 1;
    return out;
  }
  /**
   * Returns Frobenius norm of a {@link Mat4}
   * @category Static
   *
   * @param a - the matrix to calculate Frobenius norm of
   * @returns Frobenius norm
   */
  static frob(a) {
    return Math.sqrt(
      a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3] + a[4] * a[4] + a[5] * a[5] + a[6] * a[6] + a[7] * a[7] + a[8] * a[8] + a[9] * a[9] + a[10] * a[10] + a[11] * a[11] + a[12] * a[12] + a[13] * a[13] + a[14] * a[14] + a[15] * a[15]
    );
  }
  /**
   * Adds two {@link Mat4}'s
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    out[8] = a[8] + b[8];
    out[9] = a[9] + b[9];
    out[10] = a[10] + b[10];
    out[11] = a[11] + b[11];
    out[12] = a[12] + b[12];
    out[13] = a[13] + b[13];
    out[14] = a[14] + b[14];
    out[15] = a[15] + b[15];
    return out;
  }
  /**
   * Subtracts matrix b from matrix a
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    out[4] = a[4] - b[4];
    out[5] = a[5] - b[5];
    out[6] = a[6] - b[6];
    out[7] = a[7] - b[7];
    out[8] = a[8] - b[8];
    out[9] = a[9] - b[9];
    out[10] = a[10] - b[10];
    out[11] = a[11] - b[11];
    out[12] = a[12] - b[12];
    out[13] = a[13] - b[13];
    out[14] = a[14] - b[14];
    out[15] = a[15] - b[15];
    return out;
  }
  /**
   * Alias for {@link Mat4.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return out;
  }
  /**
   * Multiply each element of the matrix by a scalar.
   * @category Static
   *
   * @param out - the receiving matrix
   * @param a - the matrix to scale
   * @param b - amount to scale the matrix's elements by
   * @returns `out`
   */
  static multiplyScalar(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    out[8] = a[8] * b;
    out[9] = a[9] * b;
    out[10] = a[10] * b;
    out[11] = a[11] * b;
    out[12] = a[12] * b;
    out[13] = a[13] * b;
    out[14] = a[14] * b;
    out[15] = a[15] * b;
    return out;
  }
  /**
   * Adds two mat4's after multiplying each element of the second operand by a scalar value.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b's elements by before adding
   * @returns `out`
   */
  static multiplyScalarAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    out[3] = a[3] + b[3] * scale;
    out[4] = a[4] + b[4] * scale;
    out[5] = a[5] + b[5] * scale;
    out[6] = a[6] + b[6] * scale;
    out[7] = a[7] + b[7] * scale;
    out[8] = a[8] + b[8] * scale;
    out[9] = a[9] + b[9] * scale;
    out[10] = a[10] + b[10] * scale;
    out[11] = a[11] + b[11] * scale;
    out[12] = a[12] + b[12] * scale;
    out[13] = a[13] + b[13] * scale;
    out[14] = a[14] + b[14] * scale;
    out[15] = a[15] + b[15] * scale;
    return out;
  }
  /**
   * Returns whether two {@link Mat4}s have exactly the same elements in the same position (when compared with ===).
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7] && a[8] === b[8] && a[9] === b[9] && a[10] === b[10] && a[11] === b[11] && a[12] === b[12] && a[13] === b[13] && a[14] === b[14] && a[15] === b[15];
  }
  /**
   * Returns whether two {@link Mat4}s have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first matrix.
   * @param b - The second matrix.
   * @returns True if the matrices are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const a6 = a[6];
    const a7 = a[7];
    const a8 = a[8];
    const a9 = a[9];
    const a10 = a[10];
    const a11 = a[11];
    const a12 = a[12];
    const a13 = a[13];
    const a14 = a[14];
    const a15 = a[15];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    const b4 = b[4];
    const b5 = b[5];
    const b6 = b[6];
    const b7 = b[7];
    const b8 = b[8];
    const b9 = b[9];
    const b10 = b[10];
    const b11 = b[11];
    const b12 = b[12];
    const b13 = b[13];
    const b14 = b[14];
    const b15 = b[15];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= GLM_EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= GLM_EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= GLM_EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= GLM_EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= GLM_EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7)) && Math.abs(a8 - b8) <= GLM_EPSILON * Math.max(1, Math.abs(a8), Math.abs(b8)) && Math.abs(a9 - b9) <= GLM_EPSILON * Math.max(1, Math.abs(a9), Math.abs(b9)) && Math.abs(a10 - b10) <= GLM_EPSILON * Math.max(1, Math.abs(a10), Math.abs(b10)) && Math.abs(a11 - b11) <= GLM_EPSILON * Math.max(1, Math.abs(a11), Math.abs(b11)) && Math.abs(a12 - b12) <= GLM_EPSILON * Math.max(1, Math.abs(a12), Math.abs(b12)) && Math.abs(a13 - b13) <= GLM_EPSILON * Math.max(1, Math.abs(a13), Math.abs(b13)) && Math.abs(a14 - b14) <= GLM_EPSILON * Math.max(1, Math.abs(a14), Math.abs(b14)) && Math.abs(a15 - b15) <= GLM_EPSILON * Math.max(1, Math.abs(a15), Math.abs(b15));
  }
  /**
   * Returns a string representation of a {@link Mat4}
   * @category Static
   *
   * @param a - matrix to represent as a string
   * @returns string representation of the matrix
   */
  static str(a) {
    return `Mat4(${a.join(", ")})`;
  }
};
Mat4.prototype.mul = Mat4.prototype.multiply;
Mat4.sub = Mat4.subtract;
Mat4.mul = Mat4.multiply;
Mat4.frustum = Mat4.frustumNO;
Mat4.perspective = Mat4.perspectiveNO;
Mat4.ortho = Mat4.orthoNO;
var Vec3 = class _Vec3 extends Float32Array {
  /**
   * Create a {@link Vec3}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 3:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 3);
        break;
      case 1: {
        const v = values[0];
        if (typeof v === "number") {
          super([v, v, v]);
        } else {
          super(v, 0, 3);
        }
        break;
      }
      default:
        super(3);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the vector. Equivalent to `this[0];`
   * @category Vector Components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the vector. Equivalent to `this[1];`
   * @category Vector Components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  /**
   * The z component of the vector. Equivalent to `this[2];`
   * @category Vector Components
   */
  get z() {
    return this[2];
  }
  set z(value) {
    this[2] = value;
  }
  // Alternate set of getters and setters in case this is being used to define
  // a color.
  /**
   * The r component of the vector. Equivalent to `this[0];`
   * @category Color Components
   */
  get r() {
    return this[0];
  }
  set r(value) {
    this[0] = value;
  }
  /**
   * The g component of the vector. Equivalent to `this[1];`
   * @category Color Components
   */
  get g() {
    return this[1];
  }
  set g(value) {
    this[1] = value;
  }
  /**
   * The b component of the vector. Equivalent to `this[2];`
   * @category Color Components
   */
  get b() {
    return this[2];
  }
  set b(value) {
    this[2] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Vec3.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   *
   * @category Accessors
   */
  get magnitude() {
    const x = this[0];
    const y = this[1];
    const z = this[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  /**
   * Alias for {@link Vec3.magnitude}
   *
   * @category Accessors
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * The squared magnitude (length) of `this`.
   * Equivalent to `Vec3.squaredMagnitude(this);`
   *
   * @category Accessors
   */
  get squaredMagnitude() {
    const x = this[0];
    const y = this[1];
    const z = this[2];
    return x * x + y * y + z * z;
  }
  /**
   * Alias for {@link Vec3.squaredMagnitude}
   *
   * @category Accessors
   */
  get sqrMag() {
    return this.squaredMagnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Vec3.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Vec3.str(this);
  }
  // ===================
  // Instances methods
  // ===================
  /**
   * Copy the values from another {@link Vec3} into `this`.
   * @category Methods
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a) {
    this.set(a);
    return this;
  }
  /**
   * Adds a {@link Vec3} to `this`.
   * Equivalent to `Vec3.add(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to add to `this`
   * @returns `this`
   */
  add(b) {
    this[0] += b[0];
    this[1] += b[1];
    this[2] += b[2];
    return this;
  }
  /**
   * Subtracts a {@link Vec3} from `this`.
   * Equivalent to `Vec3.subtract(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to subtract from `this`
   * @returns `this`
   */
  subtract(b) {
    this[0] -= b[0];
    this[1] -= b[1];
    this[2] -= b[2];
    return this;
  }
  /**
   * Alias for {@link Vec3.subtract}
   * @category Methods
   */
  sub(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Multiplies `this` by a {@link Vec3}.
   * Equivalent to `Vec3.multiply(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b) {
    this[0] *= b[0];
    this[1] *= b[1];
    this[2] *= b[2];
    return this;
  }
  /**
   * Alias for {@link Vec3.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Divides `this` by a {@link Vec3}.
   * Equivalent to `Vec3.divide(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to divide `this` by
   * @returns `this`
   */
  divide(b) {
    this[0] /= b[0];
    this[1] /= b[1];
    this[2] /= b[2];
    return this;
  }
  /**
   * Alias for {@link Vec3.divide}
   * @category Methods
   */
  div(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Scales `this` by a scalar number.
   * Equivalent to `Vec3.scale(this, this, b);`
   * @category Methods
   *
   * @param b - Amount to scale `this` by
   * @returns `this`
   */
  scale(b) {
    this[0] *= b;
    this[1] *= b;
    this[2] *= b;
    return this;
  }
  /**
   * Calculates `this` scaled by a scalar value then adds the result to `this`.
   * Equivalent to `Vec3.scaleAndAdd(this, this, b, scale);`
   * @category Methods
   *
   * @param b - The vector to add to `this`
   * @param scale - The amount to scale `b` by before adding
   * @returns `this`
   */
  scaleAndAdd(b, scale) {
    this[0] += b[0] * scale;
    this[1] += b[1] * scale;
    this[2] += b[2] * scale;
    return this;
  }
  /**
   * Calculates the Euclidean distance between another {@link Vec3} and `this`.
   * Equivalent to `Vec3.distance(this, b);`
   * @category Methods
   *
   * @param b - The vector to calculate the distance to
   * @returns Distance between `this` and `b`
   */
  distance(b) {
    return _Vec3.distance(this, b);
  }
  /**
   * Alias for {@link Vec3.distance}
   * @category Methods
   */
  dist(b) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared Euclidean distance between another {@link Vec3} and `this`.
   * Equivalent to `Vec3.squaredDistance(this, b);`
   * @category Methods
   *
   * @param b The vector to calculate the squared distance to
   * @returns Squared distance between `this` and `b`
   */
  squaredDistance(b) {
    return _Vec3.squaredDistance(this, b);
  }
  /**
   * Alias for {@link Vec3.squaredDistance}
   * @category Methods
   */
  sqrDist(b) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Negates the components of `this`.
   * Equivalent to `Vec3.negate(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  negate() {
    this[0] *= -1;
    this[1] *= -1;
    this[2] *= -1;
    return this;
  }
  /**
   * Inverts the components of `this`.
   * Equivalent to `Vec3.inverse(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  invert() {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    return this;
  }
  /**
   * Sets each component of `this` to its absolute value.
   * Equivalent to `Vec3.abs(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  abs() {
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    return this;
  }
  /**
   * Calculates the dot product of this and another {@link Vec3}.
   * Equivalent to `Vec3.dot(this, b);`
   * @category Methods
   *
   * @param b - The second operand
   * @returns Dot product of `this` and `b`
   */
  dot(b) {
    return this[0] * b[0] + this[1] * b[1] + this[2] * b[2];
  }
  /**
   * Normalize `this`.
   * Equivalent to `Vec3.normalize(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  normalize() {
    return _Vec3.normalize(this, this);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Vec3}.
   */
  static get BYTE_LENGTH() {
    return 3 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, empty vec3
   * @category Static
   *
   * @returns a new 3D vector
   */
  static create() {
    return new _Vec3();
  }
  /**
   * Creates a new vec3 initialized with values from an existing vector
   * @category Static
   *
   * @param a - vector to clone
   * @returns a new 3D vector
   */
  static clone(a) {
    return new _Vec3(a);
  }
  /**
   * Calculates the magnitude (length) of a {@link Vec3}
   * @category Static
   *
   * @param a - Vector to calculate magnitude of
   * @returns Magnitude of a
   */
  static magnitude(a) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  /**
   * Alias for {@link Vec3.magnitude}
   * @category Static
   */
  static mag(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Vec3.magnitude}
   * @category Static
   * @deprecated Use {@link Vec3.magnitude} to avoid conflicts with builtin `length` methods/attribs
   *
   * @param a - vector to calculate length of
   * @returns length of a
   */
  // Length conflicts with Function.length
  static length(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Vec3.magnitude}
   * @category Static
   * @deprecated Use {@link Vec3.mag}
   */
  static len(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Creates a new vec3 initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @returns a new 3D vector
   */
  static fromValues(x, y, z) {
    return new _Vec3(x, y, z);
  }
  /**
   * Copy the values from one vec3 to another
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the source vector
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
  }
  /**
   * Set the components of a vec3 to the given values
   * @category Static
   *
   * @param out - the receiving vector
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @returns `out`
   */
  static set(out, x, y, z) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    return out;
  }
  /**
   * Adds two {@link Vec3}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
  }
  /**
   * Subtracts vector b from vector a
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }
  /**
   * Alias for {@link Vec3.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return [0, 0, 0];
  }
  /**
   * Multiplies two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    return out;
  }
  /**
   * Alias for {@link Vec3.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return [0, 0, 0];
  }
  /**
   * Divides two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    return out;
  }
  /**
   * Alias for {@link Vec3.divide}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static div(out, a, b) {
    return [0, 0, 0];
  }
  /**
   * Math.ceil the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to ceil
   * @returns `out`
   */
  static ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    return out;
  }
  /**
   * Math.floor the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to floor
   * @returns `out`
   */
  static floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    return out;
  }
  /**
   * Returns the minimum of two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    return out;
  }
  /**
   * Returns the maximum of two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    return out;
  }
  /**
   * symmetric round the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to round
   * @returns `out`
   */
  /*
    static round(out: Vec3Like, a: Readonly<Vec3Like>): Vec3Like {
    out[0] = glMatrix.round(a[0]);
    out[1] = glMatrix.round(a[1]);
    out[2] = glMatrix.round(a[2]);
    return out;
  }*/
  /**
   * Scales a vec3 by a scalar number
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to scale
   * @param scale - amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a, scale) {
    out[0] = a[0] * scale;
    out[1] = a[1] * scale;
    out[2] = a[2] * scale;
    return out;
  }
  /**
   * Adds two vec3's after scaling the second operand by a scalar value
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b by before adding
   * @returns `out`
   */
  static scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    return out;
  }
  /**
   * Calculates the Euclidean distance between two vec3's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns distance between a and b
   */
  static distance(a, b) {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    return Math.sqrt(x * x + y * y + z * z);
  }
  /**
   * Alias for {@link Vec3.distance}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static dist(a, b) {
    return 0;
  }
  /**
   * Calculates the squared Euclidean distance between two vec3's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns squared distance between a and b
   */
  static squaredDistance(a, b) {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    return x * x + y * y + z * z;
  }
  /**
   * Alias for {@link Vec3.squaredDistance}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sqrDist(a, b) {
    return 0;
  }
  /**
   * Calculates the squared length of a vec3
   * @category Static
   *
   * @param a - vector to calculate squared length of
   * @returns squared length of a
   */
  static squaredLength(a) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    return x * x + y * y + z * z;
  }
  /**
   * Alias for {@link Vec3.squaredLength}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sqrLen(a, b) {
    return 0;
  }
  /**
   * Negates the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to negate
   * @returns `out`
   */
  static negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    return out;
  }
  /**
   * Returns the inverse of the components of a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to invert
   * @returns `out`
   */
  static inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    return out;
  }
  /**
   * Returns the absolute value of the components of a {@link Vec3}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to compute the absolute values of
   * @returns `out`
   */
  static abs(out, a) {
    out[0] = Math.abs(a[0]);
    out[1] = Math.abs(a[1]);
    out[2] = Math.abs(a[2]);
    return out;
  }
  /**
   * Normalize a vec3
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to normalize
   * @returns `out`
   */
  static normalize(out, a) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    let len = x * x + y * y + z * z;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
    return out;
  }
  /**
   * Calculates the dot product of two vec3's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns dot product of a and b
   */
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  /**
   * Computes the cross product of two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static cross(out, a, b) {
    const ax = a[0], ay = a[1], az = a[2];
    const bx = b[0], by = b[1], bz = b[2];
    out[0] = ay * bz - az * by;
    out[1] = az * bx - ax * bz;
    out[2] = ax * by - ay * bx;
    return out;
  }
  /**
   * Performs a linear interpolation between two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a, b, t) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    return out;
  }
  /**
   * Performs a spherical linear interpolation between two vec3's
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static slerp(out, a, b, t) {
    const angle = Math.acos(Math.min(Math.max(_Vec3.dot(a, b), -1), 1));
    const sinTotal = Math.sin(angle);
    const ratioA = Math.sin((1 - t) * angle) / sinTotal;
    const ratioB = Math.sin(t * angle) / sinTotal;
    out[0] = ratioA * a[0] + ratioB * b[0];
    out[1] = ratioA * a[1] + ratioB * b[1];
    out[2] = ratioA * a[2] + ratioB * b[2];
    return out;
  }
  /**
   * Performs a hermite interpolation with two control points
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param c - the third operand
   * @param d - the fourth operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static hermite(out, a, b, c, d, t) {
    const factorTimes2 = t * t;
    const factor1 = factorTimes2 * (2 * t - 3) + 1;
    const factor2 = factorTimes2 * (t - 2) + t;
    const factor3 = factorTimes2 * (t - 1);
    const factor4 = factorTimes2 * (3 - 2 * t);
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  /**
   * Performs a bezier interpolation with two control points
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param c - the third operand
   * @param d - the fourth operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static bezier(out, a, b, c, d, t) {
    const inverseFactor = 1 - t;
    const inverseFactorTimesTwo = inverseFactor * inverseFactor;
    const factorTimes2 = t * t;
    const factor1 = inverseFactorTimesTwo * inverseFactor;
    const factor2 = 3 * t * inverseFactorTimesTwo;
    const factor3 = 3 * factorTimes2 * inverseFactor;
    const factor4 = factorTimes2 * t;
    out[0] = a[0] * factor1 + b[0] * factor2 + c[0] * factor3 + d[0] * factor4;
    out[1] = a[1] * factor1 + b[1] * factor2 + c[1] * factor3 + d[1] * factor4;
    out[2] = a[2] * factor1 + b[2] * factor2 + c[2] * factor3 + d[2] * factor4;
    return out;
  }
  /**
   * Generates a random vector with the given scale
   * @category Static
   *
   * @param out - the receiving vector
   * @param {Number} [scale] Length of the resulting vector. If omitted, a unit vector will be returned
   * @returns `out`
   */
  /*
      static random(out: Vec3Like, scale) {
      scale = scale === undefined ? 1.0 : scale;
  
      let r = glMatrix.RANDOM() * 2.0 * Math.PI;
      let z = glMatrix.RANDOM() * 2.0 - 1.0;
      let zScale = Math.sqrt(1.0 - z * z) * scale;
  
      out[0] = Math.cos(r) * zScale;
      out[1] = Math.sin(r) * zScale;
      out[2] = z * scale;
      return out;
    }*/
  /**
   * Transforms the vec3 with a mat4.
   * 4th vector component is implicitly '1'
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param m - matrix to transform with
   * @returns `out`
   */
  static transformMat4(out, a, m) {
    const x = a[0], y = a[1], z = a[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1;
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    return out;
  }
  /**
   * Transforms the vec3 with a mat3.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param m - the 3x3 matrix to transform with
   * @returns `out`
   */
  static transformMat3(out, a, m) {
    const x = a[0], y = a[1], z = a[2];
    out[0] = x * m[0] + y * m[3] + z * m[6];
    out[1] = x * m[1] + y * m[4] + z * m[7];
    out[2] = x * m[2] + y * m[5] + z * m[8];
    return out;
  }
  /**
   * Transforms the vec3 with a quat
   * Can also be used for dual quaternions. (Multiply it with the real part)
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param q - quaternion to transform with
   * @returns `out`
   */
  static transformQuat(out, a, q) {
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const w2 = q[3] * 2;
    const x = a[0];
    const y = a[1];
    const z = a[2];
    const uvx = qy * z - qz * y;
    const uvy = qz * x - qx * z;
    const uvz = qx * y - qy * x;
    const uuvx = (qy * uvz - qz * uvy) * 2;
    const uuvy = (qz * uvx - qx * uvz) * 2;
    const uuvz = (qx * uvy - qy * uvx) * 2;
    out[0] = x + uvx * w2 + uuvx;
    out[1] = y + uvy * w2 + uuvy;
    out[2] = z + uvz * w2 + uuvz;
    return out;
  }
  /**
   * Rotate a 3D vector around the x-axis
   * @category Static
   *
   * @param out - The receiving vec3
   * @param a - The vec3 point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotateX(out, a, b, rad) {
    const by = b[1];
    const bz = b[2];
    const py = a[1] - by;
    const pz = a[2] - bz;
    out[0] = a[0];
    out[1] = py * Math.cos(rad) - pz * Math.sin(rad) + by;
    out[2] = py * Math.sin(rad) + pz * Math.cos(rad) + bz;
    return out;
  }
  /**
   * Rotate a 3D vector around the y-axis
   * @category Static
   *
   * @param out - The receiving vec3
   * @param a - The vec3 point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotateY(out, a, b, rad) {
    const bx = b[0];
    const bz = b[2];
    const px = a[0] - bx;
    const pz = a[2] - bz;
    out[0] = pz * Math.sin(rad) + px * Math.cos(rad) + bx;
    out[1] = a[1];
    out[2] = pz * Math.cos(rad) - px * Math.sin(rad) + bz;
    return out;
  }
  /**
   * Rotate a 3D vector around the z-axis
   * @category Static
   *
   * @param out - The receiving vec3
   * @param a - The vec3 point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotateZ(out, a, b, rad) {
    const bx = b[0];
    const by = b[1];
    const px = a[0] - bx;
    const py = a[1] - by;
    out[0] = px * Math.cos(rad) - py * Math.sin(rad) + bx;
    out[1] = px * Math.sin(rad) + py * Math.cos(rad) + by;
    out[2] = b[2];
    return out;
  }
  /**
   * Get the angle between two 3D vectors
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns The angle in radians
   */
  static angle(a, b) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const mag = Math.sqrt((ax * ax + ay * ay + az * az) * (bx * bx + by * by + bz * bz));
    const cosine = mag && _Vec3.dot(a, b) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  /**
   * Set the components of a vec3 to zero
   * @category Static
   *
   * @param out - the receiving vector
   * @returns `out`
   */
  static zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  /**
   * Returns a string representation of a vector
   * @category Static
   *
   * @param a - vector to represent as a string
   * @returns string representation of the vector
   */
  static str(a) {
    return `Vec3(${a.join(", ")})`;
  }
  /**
   * Returns whether the vectors have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  /**
   * Returns whether the vectors have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2));
  }
};
Vec3.prototype.sub = Vec3.prototype.subtract;
Vec3.prototype.mul = Vec3.prototype.multiply;
Vec3.prototype.div = Vec3.prototype.divide;
Vec3.prototype.dist = Vec3.prototype.distance;
Vec3.prototype.sqrDist = Vec3.prototype.squaredDistance;
Vec3.sub = Vec3.subtract;
Vec3.mul = Vec3.multiply;
Vec3.div = Vec3.divide;
Vec3.dist = Vec3.distance;
Vec3.sqrDist = Vec3.squaredDistance;
Vec3.sqrLen = Vec3.squaredLength;
Vec3.mag = Vec3.magnitude;
Vec3.length = Vec3.magnitude;
Vec3.len = Vec3.magnitude;
var Vec4 = class _Vec4 extends Float32Array {
  /**
   * Create a {@link Vec4}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 4:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 4);
        break;
      case 1: {
        const v = values[0];
        if (typeof v === "number") {
          super([v, v, v, v]);
        } else {
          super(v, 0, 4);
        }
        break;
      }
      default:
        super(4);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the vector. Equivalent to `this[0];`
   * @category Vector Components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the vector. Equivalent to `this[1];`
   * @category Vector Components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  /**
   * The z component of the vector. Equivalent to `this[2];`
   * @category Vector Components
   */
  get z() {
    return this[2];
  }
  set z(value) {
    this[2] = value;
  }
  /**
   * The w component of the vector. Equivalent to `this[3];`
   * @category Vector Components
   */
  get w() {
    return this[3];
  }
  set w(value) {
    this[3] = value;
  }
  // Alternate set of getters and setters in case this is being used to define
  // a color.
  /**
   * The r component of the vector. Equivalent to `this[0];`
   * @category Color Components
   */
  get r() {
    return this[0];
  }
  set r(value) {
    this[0] = value;
  }
  /**
   * The g component of the vector. Equivalent to `this[1];`
   * @category Color Components
   */
  get g() {
    return this[1];
  }
  set g(value) {
    this[1] = value;
  }
  /**
   * The b component of the vector. Equivalent to `this[2];`
   * @category Color Components
   */
  get b() {
    return this[2];
  }
  set b(value) {
    this[2] = value;
  }
  /**
   * The a component of the vector. Equivalent to `this[3];`
   * @category Color Components
   */
  get a() {
    return this[3];
  }
  set a(value) {
    this[3] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Vec4.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   *
   * @category Accessors
   */
  get magnitude() {
    const x = this[0];
    const y = this[1];
    const z = this[2];
    const w = this[3];
    return Math.sqrt(x * x + y * y + z * z + w * w);
  }
  /**
   * Alias for {@link Vec4.magnitude}
   *
   * @category Accessors
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Vec4.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Vec4.str(this);
  }
  // ===================
  // Instances methods
  // ===================
  /**
   * Copy the values from another {@link Vec4} into `this`.
   * @category Methods
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a) {
    super.set(a);
    return this;
  }
  /**
   * Adds a {@link Vec4} to `this`.
   * Equivalent to `Vec4.add(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to add to `this`
   * @returns `this`
   */
  add(b) {
    this[0] += b[0];
    this[1] += b[1];
    this[2] += b[2];
    this[3] += b[3];
    return this;
  }
  /**
   * Subtracts a {@link Vec4} from `this`.
   * Equivalent to `Vec4.subtract(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to subtract from `this`
   * @returns `this`
   */
  subtract(b) {
    this[0] -= b[0];
    this[1] -= b[1];
    this[2] -= b[2];
    this[3] -= b[3];
    return this;
  }
  /**
   * Alias for {@link Vec4.subtract}
   * @category Methods
   */
  sub(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Multiplies `this` by a {@link Vec4}.
   * Equivalent to `Vec4.multiply(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b) {
    this[0] *= b[0];
    this[1] *= b[1];
    this[2] *= b[2];
    this[3] *= b[3];
    return this;
  }
  /**
   * Alias for {@link Vec4.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Divides `this` by a {@link Vec4}.
   * Equivalent to `Vec4.divide(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to divide `this` by
   * @returns `this`
   */
  divide(b) {
    this[0] /= b[0];
    this[1] /= b[1];
    this[2] /= b[2];
    this[3] /= b[3];
    return this;
  }
  /**
   * Alias for {@link Vec4.divide}
   * @category Methods
   */
  div(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Scales `this` by a scalar number.
   * Equivalent to `Vec4.scale(this, this, b);`
   * @category Methods
   *
   * @param b - Amount to scale `this` by
   * @returns `this`
   */
  scale(b) {
    this[0] *= b;
    this[1] *= b;
    this[2] *= b;
    this[3] *= b;
    return this;
  }
  /**
   * Calculates `this` scaled by a scalar value then adds the result to `this`.
   * Equivalent to `Vec4.scaleAndAdd(this, this, b, scale);`
   * @category Methods
   *
   * @param b - The vector to add to `this`
   * @param scale - The amount to scale `b` by before adding
   * @returns `this`
   */
  scaleAndAdd(b, scale) {
    this[0] += b[0] * scale;
    this[1] += b[1] * scale;
    this[2] += b[2] * scale;
    this[3] += b[3] * scale;
    return this;
  }
  /**
   * Calculates the Euclidean distance between another {@link Vec4} and `this`.
   * Equivalent to `Vec4.distance(this, b);`
   * @category Methods
   *
   * @param b - The vector to calculate the distance to
   * @returns Distance between `this` and `b`
   */
  distance(b) {
    return _Vec4.distance(this, b);
  }
  /**
   * Alias for {@link Vec4.distance}
   * @category Methods
   */
  dist(b) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared Euclidean distance between another {@link Vec4} and `this`.
   * Equivalent to `Vec4.squaredDistance(this, b);`
   * @category Methods
   *
   * @param b The vector to calculate the squared distance to
   * @returns Squared distance between `this` and `b`
   */
  squaredDistance(b) {
    return _Vec4.squaredDistance(this, b);
  }
  /**
   * Alias for {@link Vec4.squaredDistance}
   * @category Methods
   */
  sqrDist(b) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Negates the components of `this`.
   * Equivalent to `Vec4.negate(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  negate() {
    this[0] *= -1;
    this[1] *= -1;
    this[2] *= -1;
    this[3] *= -1;
    return this;
  }
  /**
   * Inverts the components of `this`.
   * Equivalent to `Vec4.inverse(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  invert() {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    this[2] = 1 / this[2];
    this[3] = 1 / this[3];
    return this;
  }
  /**
   * Sets each component of `this` to it's absolute value.
   * Equivalent to `Vec4.abs(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  abs() {
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    this[2] = Math.abs(this[2]);
    this[3] = Math.abs(this[3]);
    return this;
  }
  /**
   * Calculates the dot product of this and another {@link Vec4}.
   * Equivalent to `Vec4.dot(this, b);`
   * @category Methods
   *
   * @param b - The second operand
   * @returns Dot product of `this` and `b`
   */
  dot(b) {
    return this[0] * b[0] + this[1] * b[1] + this[2] * b[2] + this[3] * b[3];
  }
  /**
   * Normalize `this`.
   * Equivalent to `Vec4.normalize(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  normalize() {
    return _Vec4.normalize(this, this);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Vec4}.
   */
  static get BYTE_LENGTH() {
    return 4 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, empty {@link Vec4}
   * @category Static
   *
   * @returns a new 4D vector
   */
  static create() {
    return new _Vec4();
  }
  /**
   * Creates a new {@link Vec4} initialized with values from an existing vector
   * @category Static
   *
   * @param a - vector to clone
   * @returns a new 4D vector
   */
  static clone(a) {
    return new _Vec4(a);
  }
  /**
   * Creates a new {@link Vec4} initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @param w - W component
   * @returns a new 4D vector
   */
  static fromValues(x, y, z, w) {
    return new _Vec4(x, y, z, w);
  }
  /**
   * Copy the values from one {@link Vec4} to another
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the source vector
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  /**
   * Set the components of a {@link Vec4} to the given values
   * @category Static
   *
   * @param out - the receiving vector
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @param w - W component
   * @returns `out`
   */
  static set(out, x, y, z, w) {
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = w;
    return out;
  }
  /**
   * Adds two {@link Vec4}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    return out;
  }
  /**
   * Subtracts vector b from vector a
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    out[3] = a[3] - b[3];
    return out;
  }
  /**
   * Alias for {@link Vec4.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return out;
  }
  /**
   * Multiplies two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    out[2] = a[2] * b[2];
    out[3] = a[3] * b[3];
    return out;
  }
  /**
   * Alias for {@link Vec4.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Divides two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    out[2] = a[2] / b[2];
    out[3] = a[3] / b[3];
    return out;
  }
  /**
   * Alias for {@link Vec4.divide}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static div(out, a, b) {
    return out;
  }
  /**
   * Math.ceil the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to ceil
   * @returns `out`
   */
  static ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    out[2] = Math.ceil(a[2]);
    out[3] = Math.ceil(a[3]);
    return out;
  }
  /**
   * Math.floor the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to floor
   * @returns `out`
   */
  static floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    out[2] = Math.floor(a[2]);
    out[3] = Math.floor(a[3]);
    return out;
  }
  /**
   * Returns the minimum of two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    out[2] = Math.min(a[2], b[2]);
    out[3] = Math.min(a[3], b[3]);
    return out;
  }
  /**
   * Returns the maximum of two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    out[2] = Math.max(a[2], b[2]);
    out[3] = Math.max(a[3], b[3]);
    return out;
  }
  /**
   * Math.round the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to round
   * @returns `out`
   */
  static round(out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    out[2] = Math.round(a[2]);
    out[3] = Math.round(a[3]);
    return out;
  }
  /**
   * Scales a {@link Vec4} by a scalar number
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to scale
   * @param scale - amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a, scale) {
    out[0] = a[0] * scale;
    out[1] = a[1] * scale;
    out[2] = a[2] * scale;
    out[3] = a[3] * scale;
    return out;
  }
  /**
   * Adds two {@link Vec4}'s after scaling the second operand by a scalar value
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param scale - the amount to scale b by before adding
   * @returns `out`
   */
  static scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    out[2] = a[2] + b[2] * scale;
    out[3] = a[3] + b[3] * scale;
    return out;
  }
  /**
   * Calculates the Euclidean distance between two {@link Vec4}'s
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns distance between a and b
   */
  static distance(a, b) {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    const w = b[3] - a[3];
    return Math.hypot(x, y, z, w);
  }
  /**
   * Alias for {@link Vec4.distance}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static dist(a, b) {
    return 0;
  }
  /**
   * Calculates the squared Euclidean distance between two {@link Vec4}'s
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns squared distance between a and b
   */
  static squaredDistance(a, b) {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    const w = b[3] - a[3];
    return x * x + y * y + z * z + w * w;
  }
  /**
   * Alias for {@link Vec4.squaredDistance}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sqrDist(a, b) {
    return 0;
  }
  /**
   * Calculates the magnitude (length) of a {@link Vec4}
   * @category Static
   *
   * @param a - vector to calculate length of
   * @returns length of `a`
   */
  static magnitude(a) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    const w = a[3];
    return Math.sqrt(x * x + y * y + z * z + w * w);
  }
  /**
   * Alias for {@link Vec4.magnitude}
   * @category Static
   */
  static mag(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Vec4.magnitude}
   * @category Static
   * @deprecated Use {@link Vec4.magnitude} to avoid conflicts with builtin `length` methods/attribs
   */
  // Length conflicts with Function.length
  static length(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Vec4.magnitude}
   * @category Static
   * @deprecated Use {@link Vec4.mag}
   */
  static len(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared length of a {@link Vec4}
   * @category Static
   *
   * @param a - vector to calculate squared length of
   * @returns squared length of a
   */
  static squaredLength(a) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    const w = a[3];
    return x * x + y * y + z * z + w * w;
  }
  /**
   * Alias for {@link Vec4.squaredLength}
   * @category Static
   */
  static sqrLen(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Negates the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to negate
   * @returns `out`
   */
  static negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = -a[3];
    return out;
  }
  /**
   * Returns the inverse of the components of a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to invert
   * @returns `out`
   */
  static inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    out[2] = 1 / a[2];
    out[3] = 1 / a[3];
    return out;
  }
  /**
   * Returns the absolute value of the components of a {@link Vec4}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to compute the absolute values of
   * @returns `out`
   */
  static abs(out, a) {
    out[0] = Math.abs(a[0]);
    out[1] = Math.abs(a[1]);
    out[2] = Math.abs(a[2]);
    out[3] = Math.abs(a[3]);
    return out;
  }
  /**
   * Normalize a {@link Vec4}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - vector to normalize
   * @returns `out`
   */
  static normalize(out, a) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    const w = a[3];
    let len = x * x + y * y + z * z + w * w;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = x * len;
    out[1] = y * len;
    out[2] = z * len;
    out[3] = w * len;
    return out;
  }
  /**
   * Calculates the dot product of two {@link Vec4}'s
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns dot product of a and b
   */
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  /**
   * Returns the cross-product of three vectors in a 4-dimensional space
   * @category Static
   *
   * @param out the receiving vector
   * @param u - the first vector
   * @param v - the second vector
   * @param w - the third vector
   * @returns result
   */
  static cross(out, u, v, w) {
    const a = v[0] * w[1] - v[1] * w[0];
    const b = v[0] * w[2] - v[2] * w[0];
    const c = v[0] * w[3] - v[3] * w[0];
    const d = v[1] * w[2] - v[2] * w[1];
    const e = v[1] * w[3] - v[3] * w[1];
    const f = v[2] * w[3] - v[3] * w[2];
    const g = u[0];
    const h = u[1];
    const i = u[2];
    const j = u[3];
    out[0] = h * f - i * e + j * d;
    out[1] = -(g * f) + i * c - j * b;
    out[2] = g * e - h * c + j * a;
    out[3] = -(g * d) + h * b - i * a;
    return out;
  }
  /**
   * Performs a linear interpolation between two {@link Vec4}'s
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a, b, t) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    out[2] = az + t * (b[2] - az);
    out[3] = aw + t * (b[3] - aw);
    return out;
  }
  /**
   * Generates a random vector with the given scale
   * @category Static
   *
   * @param out - the receiving vector
   * @param [scale] - Length of the resulting vector. If ommitted, a unit vector will be returned
   * @returns `out`
   */
  /*
      static random(out: Vec4Like, scale): Vec4Like {
      scale = scale || 1.0;
  
      // Marsaglia, George. Choosing a Point from the Surface of a
      // Sphere. Ann. Math. Statist. 43 (1972), no. 2, 645--646.
      // http://projecteuclid.org/euclid.aoms/1177692644;
      var v1, v2, v3, v4;
      var s1, s2;
      do {
        v1 = glMatrix.RANDOM() * 2 - 1;
        v2 = glMatrix.RANDOM() * 2 - 1;
        s1 = v1 * v1 + v2 * v2;
      } while (s1 >= 1);
      do {
        v3 = glMatrix.RANDOM() * 2 - 1;
        v4 = glMatrix.RANDOM() * 2 - 1;
        s2 = v3 * v3 + v4 * v4;
      } while (s2 >= 1);
  
      var d = Math.sqrt((1 - s1) / s2);
      out[0] = scale * v1;
      out[1] = scale * v2;
      out[2] = scale * v3 * d;
      out[3] = scale * v4 * d;
      return out;
    }*/
  /**
   * Transforms the {@link Vec4} with a {@link Mat4}.
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param m - matrix to transform with
   * @returns `out`
   */
  static transformMat4(out, a, m) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    const w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
  }
  /**
   * Transforms the {@link Vec4} with a {@link Quat}
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to transform
   * @param q - quaternion to transform with
   * @returns `out`
   */
  static transformQuat(out, a, q) {
    const x = a[0];
    const y = a[1];
    const z = a[2];
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    out[3] = a[3];
    return out;
  }
  /**
   * Set the components of a {@link Vec4} to zero
   * @category Static
   *
   * @param out - the receiving vector
   * @returns `out`
   */
  static zero(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    return out;
  }
  /**
   * Returns a string representation of a {@link Vec4}
   * @category Static
   *
   * @param a - vector to represent as a string
   * @returns string representation of the vector
   */
  static str(a) {
    return `Vec4(${a.join(", ")})`;
  }
  /**
   * Returns whether the vectors have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
  }
  /**
   * Returns whether the vectors have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= GLM_EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3));
  }
};
Vec4.prototype.sub = Vec4.prototype.subtract;
Vec4.prototype.mul = Vec4.prototype.multiply;
Vec4.prototype.div = Vec4.prototype.divide;
Vec4.prototype.dist = Vec4.prototype.distance;
Vec4.prototype.sqrDist = Vec4.prototype.squaredDistance;
Vec4.sub = Vec4.subtract;
Vec4.mul = Vec4.multiply;
Vec4.div = Vec4.divide;
Vec4.dist = Vec4.distance;
Vec4.sqrDist = Vec4.squaredDistance;
Vec4.sqrLen = Vec4.squaredLength;
Vec4.mag = Vec4.magnitude;
Vec4.length = Vec4.magnitude;
Vec4.len = Vec4.magnitude;
var Quat = class _Quat extends Float32Array {
  static #DEFAULT_ANGLE_ORDER = "zyx";
  // Temporary variables to prevent repeated allocations in the algorithms within Quat.
  // These are declared as TypedArrays to aid in tree-shaking.
  static #TMP_QUAT1 = new Float32Array(4);
  static #TMP_QUAT2 = new Float32Array(4);
  static #TMP_MAT3 = new Float32Array(9);
  static #TMP_VEC3 = new Float32Array(3);
  static #X_UNIT_VEC3 = new Float32Array([1, 0, 0]);
  static #Y_UNIT_VEC3 = new Float32Array([0, 1, 0]);
  /**
   * Create a {@link Quat}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 4:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 4);
        break;
      case 1: {
        const v = values[0];
        if (typeof v === "number") {
          super([v, v, v, v]);
        } else {
          super(v, 0, 4);
        }
        break;
      }
      default:
        super(4);
        this[3] = 1;
        break;
    }
  }
  // ============
  // Accessors
  // ============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the quaternion. Equivalent to `this[0];`
   * @category Quaternion Components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the quaternion. Equivalent to `this[1];`
   * @category Quaternion Components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  /**
   * The z component of the quaternion. Equivalent to `this[2];`
   * @category Quaternion Components
   */
  get z() {
    return this[2];
  }
  set z(value) {
    this[2] = value;
  }
  /**
   * The w component of the quaternion. Equivalent to `this[3];`
   * @category Quaternion Components
   */
  get w() {
    return this[3];
  }
  set w(value) {
    this[3] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Quat.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   *
   * @category Accessors
   */
  get magnitude() {
    const x = this[0];
    const y = this[1];
    const z = this[2];
    const w = this[3];
    return Math.sqrt(x * x + y * y + z * z + w * w);
  }
  /**
   * Alias for {@link Quat.magnitude}
   *
   * @category Accessors
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Quat.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Quat.str(this);
  }
  // ===================
  // Instances methods
  // ===================
  /**
   * Copy the values from another {@link Quat} into `this`.
   * @category Methods
   *
   * @param a the source quaternion
   * @returns `this`
   */
  copy(a) {
    super.set(a);
    return this;
  }
  /**
   * Set `this` to the identity quaternion
   * Equivalent to Quat.identity(this)
   * @category Methods
   *
   * @returns `this`
   */
  identity() {
    this[0] = 0;
    this[1] = 0;
    this[2] = 0;
    this[3] = 1;
    return this;
  }
  /**
   * Multiplies `this` by a {@link Quat}.
   * Equivalent to `Quat.multiply(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b) {
    return _Quat.multiply(this, this, b);
  }
  /**
   * Alias for {@link Quat.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Rotates `this` by the given angle about the X axis
   * Equivalent to `Quat.rotateX(this, this, rad);`
   * @category Methods
   *
   * @param rad - angle (in radians) to rotate
   * @returns `this`
   */
  rotateX(rad) {
    return _Quat.rotateX(this, this, rad);
  }
  /**
   * Rotates `this` by the given angle about the Y axis
   * Equivalent to `Quat.rotateY(this, this, rad);`
   * @category Methods
   *
   * @param rad - angle (in radians) to rotate
   * @returns `this`
   */
  rotateY(rad) {
    return _Quat.rotateY(this, this, rad);
  }
  /**
   * Rotates `this` by the given angle about the Z axis
   * Equivalent to `Quat.rotateZ(this, this, rad);`
   * @category Methods
   *
   * @param rad - angle (in radians) to rotate
   * @returns `this`
   */
  rotateZ(rad) {
    return _Quat.rotateZ(this, this, rad);
  }
  /**
   * Inverts `this`
   * Equivalent to `Quat.invert(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  invert() {
    return _Quat.invert(this, this);
  }
  /**
   * Scales `this` by a scalar number
   * Equivalent to `Quat.scale(this, this, scale);`
   * @category Methods
   *
   * @param scale - amount to scale the vector by
   * @returns `this`
   */
  scale(scale) {
    this[0] *= scale;
    this[1] *= scale;
    this[2] *= scale;
    this[3] *= scale;
    return this;
  }
  /**
   * Calculates the dot product of `this` and another {@link Quat}
   * Equivalent to `Quat.dot(this, b);`
   * @category Methods
   *
   * @param b - the second operand
   * @returns dot product of `this` and b
   */
  dot(b) {
    return _Quat.dot(this, b);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Quat}.
   */
  static get BYTE_LENGTH() {
    return 4 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new identity quat
   * @category Static
   *
   * @returns a new quaternion
   */
  static create() {
    return new _Quat();
  }
  /**
   * Set a quat to the identity quaternion
   * @category Static
   *
   * @param out - the receiving quaternion
   * @returns `out`
   */
  static identity(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    return out;
  }
  /**
   * Sets a quat from the given angle and rotation axis,
   * then returns it.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param axis - the axis around which to rotate
   * @param rad - the angle in radians
   * @returns `out`
   **/
  static setAxisAngle(out, axis, rad) {
    rad *= 0.5;
    const s = Math.sin(rad);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = Math.cos(rad);
    return out;
  }
  /**
   * Gets the rotation axis and angle for a given
   *  quaternion. If a quaternion is created with
   *  setAxisAngle, this method will return the same
   *  values as provided in the original parameter list
   *  OR functionally equivalent values.
   * Example: The quaternion formed by axis [0, 0, 1] and
   *  angle -90 is the same as the quaternion formed by
   *  [0, 0, 1] and 270. This method favors the latter.
   * @category Static
   *
   * @param out_axis - Vector receiving the axis of rotation
   * @param q - Quaternion to be decomposed
   * @return Angle, in radians, of the rotation
   */
  static getAxisAngle(out_axis, q) {
    const rad = Math.acos(q[3]) * 2;
    const s = Math.sin(rad / 2);
    if (s > GLM_EPSILON) {
      out_axis[0] = q[0] / s;
      out_axis[1] = q[1] / s;
      out_axis[2] = q[2] / s;
    } else {
      out_axis[0] = 1;
      out_axis[1] = 0;
      out_axis[2] = 0;
    }
    return rad;
  }
  /**
   * Gets the angular distance between two unit quaternions
   * @category Static
   *
   * @param  {ReadonlyQuat} a     Origin unit quaternion
   * @param  {ReadonlyQuat} b     Destination unit quaternion
   * @return {Number}     Angle, in radians, between the two quaternions
   */
  static getAngle(a, b) {
    const dotproduct = _Quat.dot(a, b);
    return Math.acos(2 * dotproduct * dotproduct - 1);
  }
  /**
   * Multiplies two quaternions.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bx = b[0];
    const by = b[1];
    const bz = b[2];
    const bw = b[3];
    out[0] = ax * bw + aw * bx + ay * bz - az * by;
    out[1] = ay * bw + aw * by + az * bx - ax * bz;
    out[2] = az * bw + aw * bz + ax * by - ay * bx;
    out[3] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  /**
   * Rotates a quaternion by the given angle about the X axis
   * @category Static
   *
   * @param out - quat receiving operation result
   * @param a - quat to rotate
   * @param rad - angle (in radians) to rotate
   * @returns `out`
   */
  static rotateX(out, a, rad) {
    rad *= 0.5;
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bx = Math.sin(rad);
    const bw = Math.cos(rad);
    out[0] = ax * bw + aw * bx;
    out[1] = ay * bw + az * bx;
    out[2] = az * bw - ay * bx;
    out[3] = aw * bw - ax * bx;
    return out;
  }
  /**
   * Rotates a quaternion by the given angle about the Y axis
   * @category Static
   *
   * @param out - quat receiving operation result
   * @param a - quat to rotate
   * @param rad - angle (in radians) to rotate
   * @returns `out`
   */
  static rotateY(out, a, rad) {
    rad *= 0.5;
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const by = Math.sin(rad);
    const bw = Math.cos(rad);
    out[0] = ax * bw - az * by;
    out[1] = ay * bw + aw * by;
    out[2] = az * bw + ax * by;
    out[3] = aw * bw - ay * by;
    return out;
  }
  /**
   * Rotates a quaternion by the given angle about the Z axis
   * @category Static
   *
   * @param out - quat receiving operation result
   * @param a - quat to rotate
   * @param rad - angle (in radians) to rotate
   * @returns `out`
   */
  static rotateZ(out, a, rad) {
    rad *= 0.5;
    const ax = a[0];
    const ay = a[1];
    const az = a[2];
    const aw = a[3];
    const bz = Math.sin(rad);
    const bw = Math.cos(rad);
    out[0] = ax * bw + ay * bz;
    out[1] = ay * bw - ax * bz;
    out[2] = az * bw + aw * bz;
    out[3] = aw * bw - az * bz;
    return out;
  }
  /**
   * Calculates the W component of a quat from the X, Y, and Z components.
   * Assumes that quaternion is 1 unit in length.
   * Any existing W component will be ignored.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quat to calculate W component of
   * @returns `out`
   */
  static calculateW(out, a) {
    const x = a[0], y = a[1], z = a[2];
    out[0] = x;
    out[1] = y;
    out[2] = z;
    out[3] = Math.sqrt(Math.abs(1 - x * x - y * y - z * z));
    return out;
  }
  /**
   * Calculate the exponential of a unit quaternion.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quat to calculate the exponential of
   * @returns `out`
   */
  static exp(out, a) {
    const x = a[0], y = a[1], z = a[2], w = a[3];
    const r = Math.sqrt(x * x + y * y + z * z);
    const et = Math.exp(w);
    const s = r > 0 ? et * Math.sin(r) / r : 0;
    out[0] = x * s;
    out[1] = y * s;
    out[2] = z * s;
    out[3] = et * Math.cos(r);
    return out;
  }
  /**
   * Calculate the natural logarithm of a unit quaternion.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quat to calculate the exponential of
   * @returns `out`
   */
  static ln(out, a) {
    const x = a[0], y = a[1], z = a[2], w = a[3];
    const r = Math.sqrt(x * x + y * y + z * z);
    const t = r > 0 ? Math.atan2(r, w) / r : 0;
    out[0] = x * t;
    out[1] = y * t;
    out[2] = z * t;
    out[3] = 0.5 * Math.log(x * x + y * y + z * z + w * w);
    return out;
  }
  /**
   * Calculate the scalar power of a unit quaternion.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quat to calculate the exponential of
   * @param b - amount to scale the quaternion by
   * @returns `out`
   */
  static pow(out, a, b) {
    _Quat.ln(out, a);
    _Quat.scale(out, out, b);
    _Quat.exp(out, out);
    return out;
  }
  /**
   * Performs a spherical linear interpolation between two quat
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static slerp(out, a, b, t) {
    const ax = a[0], ay = a[1], az = a[2], aw = a[3];
    let bx = b[0], by = b[1], bz = b[2], bw = b[3];
    let scale0;
    let scale1;
    let cosom = ax * bx + ay * by + az * bz + aw * bw;
    if (cosom < 0) {
      cosom = -cosom;
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    if (1 - cosom > GLM_EPSILON) {
      const omega = Math.acos(cosom);
      const sinom = Math.sin(omega);
      scale0 = Math.sin((1 - t) * omega) / sinom;
      scale1 = Math.sin(t * omega) / sinom;
    } else {
      scale0 = 1 - t;
      scale1 = t;
    }
    out[0] = scale0 * ax + scale1 * bx;
    out[1] = scale0 * ay + scale1 * by;
    out[2] = scale0 * az + scale1 * bz;
    out[3] = scale0 * aw + scale1 * bw;
    return out;
  }
  /**
   * Generates a random unit quaternion
   * @category Static
   *
   * @param out - the receiving quaternion
   * @returns `out`
   */
  /* static random(out: QuatLike): QuatLike {
      // Implementation of http://planning.cs.uiuc.edu/node198.html
      // TODO: Calling random 3 times is probably not the fastest solution
      let u1 = glMatrix.RANDOM();
      let u2 = glMatrix.RANDOM();
      let u3 = glMatrix.RANDOM();
  
      let sqrt1MinusU1 = Math.sqrt(1 - u1);
      let sqrtU1 = Math.sqrt(u1);
  
      out[0] = sqrt1MinusU1 * Math.sin(2.0 * Math.PI * u2);
      out[1] = sqrt1MinusU1 * Math.cos(2.0 * Math.PI * u2);
      out[2] = sqrtU1 * Math.sin(2.0 * Math.PI * u3);
      out[3] = sqrtU1 * Math.cos(2.0 * Math.PI * u3);
      return out;
    }*/
  /**
   * Calculates the inverse of a quat
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quat to calculate inverse of
   * @returns `out`
   */
  static invert(out, a) {
    const a0 = a[0], a1 = a[1], a2 = a[2], a3 = a[3];
    const dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
    const invDot = dot ? 1 / dot : 0;
    out[0] = -a0 * invDot;
    out[1] = -a1 * invDot;
    out[2] = -a2 * invDot;
    out[3] = a3 * invDot;
    return out;
  }
  /**
   * Calculates the conjugate of a quat
   * If the quaternion is normalized, this function is faster than `quat.inverse` and produces the same result.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quat to calculate conjugate of
   * @returns `out`
   */
  static conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    return out;
  }
  /**
   * Creates a quaternion from the given 3x3 rotation matrix.
   *
   * NOTE: The resultant quaternion is not normalized, so you should be sure
   * to re-normalize the quaternion yourself where necessary.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param m - rotation matrix
   * @returns `out`
   */
  static fromMat3(out, m) {
    const fTrace = m[0] + m[4] + m[8];
    let fRoot;
    if (fTrace > 0) {
      fRoot = Math.sqrt(fTrace + 1);
      out[3] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[0] = (m[5] - m[7]) * fRoot;
      out[1] = (m[6] - m[2]) * fRoot;
      out[2] = (m[1] - m[3]) * fRoot;
    } else {
      let i = 0;
      if (m[4] > m[0]) {
        i = 1;
      }
      if (m[8] > m[i * 3 + i]) {
        i = 2;
      }
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1);
      out[i] = 0.5 * fRoot;
      fRoot = 0.5 / fRoot;
      out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
      out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
      out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
    }
    return out;
  }
  /**
   * Creates a quaternion from the given euler angle x, y, z.
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param x - Angle to rotate around X axis in degrees.
   * @param y - Angle to rotate around Y axis in degrees.
   * @param z - Angle to rotate around Z axis in degrees.
   * @param {'xyz'|'xzy'|'yxz'|'yzx'|'zxy'|'zyx'} order - Intrinsic order for conversion, default is zyx.
   * @returns `out`
   */
  static fromEuler(out, x, y, z, order = _Quat.#DEFAULT_ANGLE_ORDER) {
    const halfToRad = 0.5 * Math.PI / 180;
    x *= halfToRad;
    y *= halfToRad;
    z *= halfToRad;
    const sx = Math.sin(x);
    const cx = Math.cos(x);
    const sy = Math.sin(y);
    const cy = Math.cos(y);
    const sz = Math.sin(z);
    const cz = Math.cos(z);
    switch (order) {
      case "xyz":
        out[0] = sx * cy * cz + cx * sy * sz;
        out[1] = cx * sy * cz - sx * cy * sz;
        out[2] = cx * cy * sz + sx * sy * cz;
        out[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "xzy":
        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz - sx * cy * sz;
        out[2] = cx * cy * sz + sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;
        break;
      case "yxz":
        out[0] = sx * cy * cz + cx * sy * sz;
        out[1] = cx * sy * cz - sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;
        break;
      case "yzx":
        out[0] = sx * cy * cz + cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "zxy":
        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz + sx * sy * cz;
        out[3] = cx * cy * cz - sx * sy * sz;
        break;
      case "zyx":
        out[0] = sx * cy * cz - cx * sy * sz;
        out[1] = cx * sy * cz + sx * cy * sz;
        out[2] = cx * cy * sz - sx * sy * cz;
        out[3] = cx * cy * cz + sx * sy * sz;
        break;
      default:
        throw new Error(`Unknown angle order ${order}`);
    }
    return out;
  }
  /**
   * Returns a string representation of a quatenion
   * @category Static
   *
   * @param a - vector to represent as a string
   * @returns string representation of the vector
   */
  static str(a) {
    return `Quat(${a.join(", ")})`;
  }
  /**
   * Creates a new quat initialized with values from an existing quaternion
   * @category Static
   *
   * @param a - quaternion to clone
   * @returns a new quaternion
   */
  static clone(a) {
    return new _Quat(a);
  }
  /**
   * Creates a new quat initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @param w - W component
   * @returns a new quaternion
   */
  static fromValues(x, y, z, w) {
    return new _Quat(x, y, z, w);
  }
  /**
   * Copy the values from one quat to another
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - the source quaternion
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  /**
   * Set the components of a {@link Quat} to the given values
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param x - X component
   * @param y - Y component
   * @param z - Z component
   * @param w - W component
   * @returns `out`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static set(out, x, y, z, w) {
    return out;
  }
  /**
   * Adds two {@link Quat}'s
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static add(out, a, b) {
    return out;
  }
  /**
   * Alias for {@link Quat.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Scales a quat by a scalar number
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - the vector to scale
   * @param b - amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a, scale) {
    out[0] = a[0] * scale;
    out[1] = a[1] * scale;
    out[2] = a[2] * scale;
    out[3] = a[3] * scale;
    return out;
  }
  /**
   * Calculates the dot product of two quat's
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns dot product of a and b
   */
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  /**
   * Performs a linear interpolation between two quat's
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static lerp(out, a, b, t) {
    return out;
  }
  /**
   * Calculates the magnitude (length) of a {@link Quat}
   * @category Static
   *
   * @param a - quaternion to calculate length of
   * @returns length of `a`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static magnitude(a) {
    return 0;
  }
  /**
   * Alias for {@link Quat.magnitude}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mag(a) {
    return 0;
  }
  /**
   * Alias for {@link Quat.magnitude}
   * @category Static
   * @deprecated Use {@link Quat.magnitude} to avoid conflicts with builtin `length` methods/attribs
   */
  // Length conflicts with Function.length
  static length(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Quat.magnitude}
   * @category Static
   * @deprecated Use {@link Quat.mag}
   */
  static len(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared length of a {@link Quat}
   * @category Static
   *
   * @param a - quaternion to calculate squared length of
   * @returns squared length of a
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static squaredLength(a) {
    return 0;
  }
  /**
   * Alias for {@link Quat.squaredLength}
   * @category Static
   */
  static sqrLen(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Normalize a {@link Quat}
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - quaternion to normalize
   * @returns `out`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static normalize(out, a) {
    return out;
  }
  /**
   * Returns whether the quaternions have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first quaternion.
   * @param b - The second quaternion.
   * @returns True if the vectors are equal, false otherwise.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static exactEquals(a, b) {
    return false;
  }
  /**
   * Returns whether the quaternions have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns True if the vectors are equal, false otherwise.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static equals(a, b) {
    return false;
  }
  /**
   * Sets a quaternion to represent the shortest rotation from one
   * vector to another.
   *
   * Both vectors are assumed to be unit length.
   * @category Static
   *
   * @param out - the receiving quaternion.
   * @param a - the initial vector
   * @param b - the destination vector
   * @returns `out`
   */
  static rotationTo(out, a, b) {
    const dot = Vec3.dot(a, b);
    if (dot < -0.999999) {
      Vec3.cross(_Quat.#TMP_VEC3, _Quat.#X_UNIT_VEC3, a);
      if (Vec3.mag(_Quat.#TMP_VEC3) < 1e-6) {
        Vec3.cross(_Quat.#TMP_VEC3, _Quat.#Y_UNIT_VEC3, a);
      }
      Vec3.normalize(_Quat.#TMP_VEC3, _Quat.#TMP_VEC3);
      _Quat.setAxisAngle(out, _Quat.#TMP_VEC3, Math.PI);
      return out;
    } else if (dot > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      Vec3.cross(_Quat.#TMP_VEC3, a, b);
      out[0] = _Quat.#TMP_VEC3[0];
      out[1] = _Quat.#TMP_VEC3[1];
      out[2] = _Quat.#TMP_VEC3[2];
      out[3] = 1 + dot;
      return _Quat.normalize(out, out);
    }
  }
  /**
   * Performs a spherical linear interpolation with two control points
   * @category Static
   *
   * @param out - the receiving quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @param c - the third operand
   * @param d - the fourth operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static sqlerp(out, a, b, c, d, t) {
    _Quat.slerp(_Quat.#TMP_QUAT1, a, d, t);
    _Quat.slerp(_Quat.#TMP_QUAT2, b, c, t);
    _Quat.slerp(out, _Quat.#TMP_QUAT1, _Quat.#TMP_QUAT2, 2 * t * (1 - t));
    return out;
  }
  /**
   * Sets the specified quaternion with values corresponding to the given
   * axes. Each axis is a vec3 and is expected to be unit length and
   * perpendicular to all other specified axes.
   * @category Static
   *
   * @param out - The receiving quaternion
   * @param view - the vector representing the viewing direction
   * @param right - the vector representing the local `right` direction
   * @param up - the vector representing the local `up` direction
   * @returns `out`
   */
  static setAxes(out, view, right, up) {
    _Quat.#TMP_MAT3[0] = right[0];
    _Quat.#TMP_MAT3[3] = right[1];
    _Quat.#TMP_MAT3[6] = right[2];
    _Quat.#TMP_MAT3[1] = up[0];
    _Quat.#TMP_MAT3[4] = up[1];
    _Quat.#TMP_MAT3[7] = up[2];
    _Quat.#TMP_MAT3[2] = -view[0];
    _Quat.#TMP_MAT3[5] = -view[1];
    _Quat.#TMP_MAT3[8] = -view[2];
    return _Quat.normalize(out, _Quat.fromMat3(out, _Quat.#TMP_MAT3));
  }
};
Quat.set = Vec4.set;
Quat.add = Vec4.add;
Quat.lerp = Vec4.lerp;
Quat.normalize = Vec4.normalize;
Quat.squaredLength = Vec4.squaredLength;
Quat.sqrLen = Vec4.squaredLength;
Quat.exactEquals = Vec4.exactEquals;
Quat.equals = Vec4.equals;
Quat.magnitude = Vec4.magnitude;
Quat.prototype.mul = Quat.prototype.multiply;
Quat.mul = Quat.multiply;
Quat.mag = Quat.magnitude;
Quat.length = Quat.magnitude;
Quat.len = Quat.magnitude;
var Quat2 = class _Quat2 extends Float32Array {
  // Temporary variables to prevent repeated allocations in the algorithms within Quat2.
  // These are declared as TypedArrays to aid in tree-shaking.
  static #TMP_QUAT = new Float32Array(4);
  static #TMP_VEC3 = new Float32Array(3);
  /**
   * Create a {@link Quat2}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 8:
        super(values);
        break;
      case 2:
        super(values[0], values[1], 8);
        break;
      case 1: {
        const v = values[0];
        if (typeof v === "number") {
          super([v, v, v, v, v, v, v, v]);
        } else {
          super(v, 0, 8);
        }
        break;
      }
      default:
        super(8);
        this[3] = 1;
        break;
    }
  }
  // ============
  // Accessors
  // ============
  /**
   * A string representation of `this`
   * Equivalent to `Quat2.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Quat2.str(this);
  }
  // ===================
  // Instances methods
  // ===================
  /**
   * Copy the values from another {@link Quat2} into `this`.
   * @category Methods
   *
   * @param a the source dual quaternion
   * @returns `this`
   */
  copy(a) {
    super.set(a);
    return this;
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Quat2}.
   */
  static get BYTE_LENGTH() {
    return 8 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new identity {@link Quat2}
   * @category Static
   *
   * @returns a new dual quaternion [real -> rotation, dual -> translation]
   */
  static create() {
    return new _Quat2();
  }
  /**
   * Creates a {@link Quat2} quat initialized with values from an existing quaternion
   * @category Static
   *
   * @param a - dual quaternion to clone
   * @returns a new dual quaternion
   */
  static clone(a) {
    return new _Quat2(a);
  }
  /**
   * Creates a new {@link Quat2}  initialized with the given values
   * @category Static
   *
   * @param x1 - 1st X component
   * @param y1 - 1st Y component
   * @param z1 - 1st Z component
   * @param w1 - 1st W component
   * @param x2 - 2nd X component
   * @param y2 - 2nd Y component
   * @param z2 - 2nd Z component
   * @param w2 - 2nd W component
   * @returns a new dual quaternion
   */
  static fromValues(x1, y1, z1, w1, x2, y2, z2, w2) {
    return new _Quat2(x1, y1, z1, w1, x2, y2, z2, w2);
  }
  /**
   * Creates a new {@link Quat2} from the given values (quat and translation)
   * @category Static
   *
   * @param x1 - X component (rotation)
   * @param y1 - Y component (rotation)
   * @param z1 - Z component (rotation)
   * @param w1 - W component (rotation)
   * @param x2 - X component (translation)
   * @param y2 - Y component (translation)
   * @param z2 - Z component (translation)
   * @returns a new dual quaternion
   */
  static fromRotationTranslationValues(x1, y1, z1, w1, x2, y2, z2) {
    const ax = x2 * 0.5;
    const ay = y2 * 0.5;
    const az = z2 * 0.5;
    return new _Quat2(
      x1,
      y1,
      z1,
      w1,
      ax * w1 + ay * z1 - az * y1,
      ay * w1 + az * x1 - ax * z1,
      az * w1 + ax * y1 - ay * x1,
      -ax * x1 - ay * y1 - az * z1
    );
  }
  /**
   * Sets a {@link Quat2} from a quaternion and a translation
   * @category Static
   *
   * @param out - dual quaternion receiving operation result
   * @param q - a normalized quaternion
   * @param t - translation vector
   * @returns `out`
   */
  static fromRotationTranslation(out, q, t) {
    const ax = t[0] * 0.5;
    const ay = t[1] * 0.5;
    const az = t[2] * 0.5;
    const bx = q[0];
    const by = q[1];
    const bz = q[2];
    const bw = q[3];
    out[0] = bx;
    out[1] = by;
    out[2] = bz;
    out[3] = bw;
    out[4] = ax * bw + ay * bz - az * by;
    out[5] = ay * bw + az * bx - ax * bz;
    out[6] = az * bw + ax * by - ay * bx;
    out[7] = -ax * bx - ay * by - az * bz;
    return out;
  }
  /**
   * Sets a {@link Quat2} from a translation
   * @category Static
   *
   * @param out - dual quaternion receiving operation result
   * @param t - translation vector
   * @returns `out`
   */
  static fromTranslation(out, t) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = t[0] * 0.5;
    out[5] = t[1] * 0.5;
    out[6] = t[2] * 0.5;
    out[7] = 0;
    return out;
  }
  /**
   * Sets a {@link Quat2} from a quaternion
   * @category Static
   *
   * @param out - dual quaternion receiving operation result
   * @param q - a normalized quaternion
   * @returns `out`
   */
  static fromRotation(out, q) {
    out[0] = q[0];
    out[1] = q[1];
    out[2] = q[2];
    out[3] = q[3];
    out[4] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    return out;
  }
  /**
   * Sets a {@link Quat2} from a quaternion
   * @category Static
   *
   * @param out - dual quaternion receiving operation result
   * @param a - the matrix
   * @returns `out`
   */
  static fromMat4(out, a) {
    Mat4.getRotation(_Quat2.#TMP_QUAT, a);
    Mat4.getTranslation(_Quat2.#TMP_VEC3, a);
    return _Quat2.fromRotationTranslation(out, _Quat2.#TMP_QUAT, _Quat2.#TMP_VEC3);
  }
  /**
   * Copy the values from one {@link Quat2} to another
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the source dual quaternion
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    return out;
  }
  /**
   * Set a {@link Quat2} to the identity dual quaternion
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @returns `out`
   */
  static identity(out) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 1;
    out[4] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
    return out;
  }
  /**
   * Set the components of a {@link Quat2} to the given values
   * @category Static
   *
   * @param out - the receiving vector
   * @param x1 - 1st X component
   * @param y1 - 1st Y component
   * @param z1 - 1st Z component
   * @param w1 - 1st W component
   * @param x2 - 2nd X component
   * @param y2 - 2nd Y component
   * @param z2 - 2nd Z component
   * @param w2 - 2nd W component
   * @returns `out`
   */
  static set(out, x1, y1, z1, w1, x2, y2, z2, w2) {
    out[0] = x1;
    out[1] = y1;
    out[2] = z1;
    out[3] = w1;
    out[4] = x2;
    out[5] = y2;
    out[6] = z2;
    out[7] = w2;
    return out;
  }
  /**
   * Gets the real part of a dual quat
   * @category Static
   *
   * @param out - real part
   * @param a - Dual Quaternion
   * @return `out`
   */
  static getReal(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  /**
   * Gets the dual part of a dual quat
   * @category Static
   *
   * @param out - dual part
   * @param a - Dual Quaternion
   * @return `out`
   */
  static getDual(out, a) {
    out[0] = a[4];
    out[1] = a[5];
    out[2] = a[6];
    out[3] = a[7];
    return out;
  }
  /**
   * Set the real component of a {@link Quat2} to the given quaternion
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - a quaternion representing the real part
   * @return `out`
   */
  static setReal(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    return out;
  }
  /**
   * Set the dual component of a {@link Quat2} to the given quaternion
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - a quaternion representing the dual part
   * @return `out`
   */
  static setDual(out, a) {
    out[4] = a[0];
    out[5] = a[1];
    out[6] = a[2];
    out[7] = a[3];
    return out;
  }
  /**
   * Gets the translation of a normalized {@link Quat2}
   * @category Static
   *
   * @param out - the receiving translation vector
   * @param a - Dual Quaternion to be decomposed
   * @return `out`
   */
  static getTranslation(out, a) {
    const ax = a[4];
    const ay = a[5];
    const az = a[6];
    const aw = a[7];
    const bx = -a[0];
    const by = -a[1];
    const bz = -a[2];
    const bw = a[3];
    out[0] = (ax * bw + aw * bx + ay * bz - az * by) * 2;
    out[1] = (ay * bw + aw * by + az * bx - ax * bz) * 2;
    out[2] = (az * bw + aw * bz + ax * by - ay * bx) * 2;
    return out;
  }
  /**
   * Translates a {@link Quat2} by the given vector
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the dual quaternion to translate
   * @param v - vector to translate by
   * @returns `out`
   */
  static translate(out, a, v) {
    const ax1 = a[0];
    const ay1 = a[1];
    const az1 = a[2];
    const aw1 = a[3];
    const bx1 = v[0] * 0.5;
    const by1 = v[1] * 0.5;
    const bz1 = v[2] * 0.5;
    const ax2 = a[4];
    const ay2 = a[5];
    const az2 = a[6];
    const aw2 = a[7];
    out[0] = ax1;
    out[1] = ay1;
    out[2] = az1;
    out[3] = aw1;
    out[4] = aw1 * bx1 + ay1 * bz1 - az1 * by1 + ax2;
    out[5] = aw1 * by1 + az1 * bx1 - ax1 * bz1 + ay2;
    out[6] = aw1 * bz1 + ax1 * by1 - ay1 * bx1 + az2;
    out[7] = -ax1 * bx1 - ay1 * by1 - az1 * bz1 + aw2;
    return out;
  }
  /**
   * Rotates a {@link Quat2} around the X axis
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the dual quaternion to rotate
   * @param rad - angle (in radians) to rotate
   * @returns `out`
   */
  static rotateX(out, a, rad) {
    let bx = -a[0];
    let by = -a[1];
    let bz = -a[2];
    let bw = a[3];
    const ax = a[4];
    const ay = a[5];
    const az = a[6];
    const aw = a[7];
    const ax1 = ax * bw + aw * bx + ay * bz - az * by;
    const ay1 = ay * bw + aw * by + az * bx - ax * bz;
    const az1 = az * bw + aw * bz + ax * by - ay * bx;
    const aw1 = aw * bw - ax * bx - ay * by - az * bz;
    Quat.rotateX(out, a, rad);
    bx = out[0];
    by = out[1];
    bz = out[2];
    bw = out[3];
    out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }
  /**
   * Rotates a {@link Quat2} around the Y axis
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the dual quaternion to rotate
   * @param rad - angle (in radians) to rotate
   * @returns `out`
   */
  static rotateY(out, a, rad) {
    let bx = -a[0];
    let by = -a[1];
    let bz = -a[2];
    let bw = a[3];
    const ax = a[4];
    const ay = a[5];
    const az = a[6];
    const aw = a[7];
    const ax1 = ax * bw + aw * bx + ay * bz - az * by;
    const ay1 = ay * bw + aw * by + az * bx - ax * bz;
    const az1 = az * bw + aw * bz + ax * by - ay * bx;
    const aw1 = aw * bw - ax * bx - ay * by - az * bz;
    Quat.rotateY(out, a, rad);
    bx = out[0];
    by = out[1];
    bz = out[2];
    bw = out[3];
    out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }
  /**
   * Rotates a {@link Quat2} around the Z axis
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the dual quaternion to rotate
   * @param rad - angle (in radians) to rotate
   * @returns `out`
   */
  static rotateZ(out, a, rad) {
    let bx = -a[0];
    let by = -a[1];
    let bz = -a[2];
    let bw = a[3];
    const ax = a[4];
    const ay = a[5];
    const az = a[6];
    const aw = a[7];
    const ax1 = ax * bw + aw * bx + ay * bz - az * by;
    const ay1 = ay * bw + aw * by + az * bx - ax * bz;
    const az1 = az * bw + aw * bz + ax * by - ay * bx;
    const aw1 = aw * bw - ax * bx - ay * by - az * bz;
    Quat.rotateZ(out, a, rad);
    bx = out[0];
    by = out[1];
    bz = out[2];
    bw = out[3];
    out[4] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[5] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[6] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[7] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    return out;
  }
  /**
   * Rotates a {@link Quat2} by a given quaternion (a * q)
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the dual quaternion to rotate
   * @param q - quaternion to rotate by
   * @returns `out`
   */
  static rotateByQuatAppend(out, a, q) {
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    let ax = a[0];
    let ay = a[1];
    let az = a[2];
    let aw = a[3];
    out[0] = ax * qw + aw * qx + ay * qz - az * qy;
    out[1] = ay * qw + aw * qy + az * qx - ax * qz;
    out[2] = az * qw + aw * qz + ax * qy - ay * qx;
    out[3] = aw * qw - ax * qx - ay * qy - az * qz;
    ax = a[4];
    ay = a[5];
    az = a[6];
    aw = a[7];
    out[4] = ax * qw + aw * qx + ay * qz - az * qy;
    out[5] = ay * qw + aw * qy + az * qx - ax * qz;
    out[6] = az * qw + aw * qz + ax * qy - ay * qx;
    out[7] = aw * qw - ax * qx - ay * qy - az * qz;
    return out;
  }
  /**
   * Rotates a {@link Quat2} by a given quaternion (q * a)
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param q - quaternion to rotate by
   * @param a - the dual quaternion to rotate
   * @returns `out`
   */
  static rotateByQuatPrepend(out, q, a) {
    const qx = q[0];
    const qy = q[1];
    const qz = q[2];
    const qw = q[3];
    let bx = a[0];
    let by = a[1];
    let bz = a[2];
    let bw = a[3];
    out[0] = qx * bw + qw * bx + qy * bz - qz * by;
    out[1] = qy * bw + qw * by + qz * bx - qx * bz;
    out[2] = qz * bw + qw * bz + qx * by - qy * bx;
    out[3] = qw * bw - qx * bx - qy * by - qz * bz;
    bx = a[4];
    by = a[5];
    bz = a[6];
    bw = a[7];
    out[4] = qx * bw + qw * bx + qy * bz - qz * by;
    out[5] = qy * bw + qw * by + qz * bx - qx * bz;
    out[6] = qz * bw + qw * bz + qx * by - qy * bx;
    out[7] = qw * bw - qx * bx - qy * by - qz * bz;
    return out;
  }
  /**
   * Rotates a {@link Quat2} around a given axis. Does the normalization automatically
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the dual quaternion to rotate
   * @param axis - the axis to rotate around
   * @param rad - how far the rotation should be
   * @returns `out`
   */
  static rotateAroundAxis(out, a, axis, rad) {
    if (Math.abs(rad) < GLM_EPSILON) {
      return _Quat2.copy(out, a);
    }
    const axisLength = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
    rad *= 0.5;
    const s = Math.sin(rad);
    const bx = s * axis[0] / axisLength;
    const by = s * axis[1] / axisLength;
    const bz = s * axis[2] / axisLength;
    const bw = Math.cos(rad);
    const ax1 = a[0];
    const ay1 = a[1];
    const az1 = a[2];
    const aw1 = a[3];
    out[0] = ax1 * bw + aw1 * bx + ay1 * bz - az1 * by;
    out[1] = ay1 * bw + aw1 * by + az1 * bx - ax1 * bz;
    out[2] = az1 * bw + aw1 * bz + ax1 * by - ay1 * bx;
    out[3] = aw1 * bw - ax1 * bx - ay1 * by - az1 * bz;
    const ax = a[4];
    const ay = a[5];
    const az = a[6];
    const aw = a[7];
    out[4] = ax * bw + aw * bx + ay * bz - az * by;
    out[5] = ay * bw + aw * by + az * bx - ax * bz;
    out[6] = az * bw + aw * bz + ax * by - ay * bx;
    out[7] = aw * bw - ax * bx - ay * by - az * bz;
    return out;
  }
  /**
   * Adds two {@link Quat2}s
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    out[3] = a[3] + b[3];
    out[4] = a[4] + b[4];
    out[5] = a[5] + b[5];
    out[6] = a[6] + b[6];
    out[7] = a[7] + b[7];
    return out;
  }
  /**
   * Multiplies two {@link Quat2}s
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - the first operand
   * @param b - the second operand
   * @returns {quat2} out
   */
  static multiply(out, a, b) {
    const ax0 = a[0];
    const ay0 = a[1];
    const az0 = a[2];
    const aw0 = a[3];
    const bx1 = b[4];
    const by1 = b[5];
    const bz1 = b[6];
    const bw1 = b[7];
    const ax1 = a[4];
    const ay1 = a[5];
    const az1 = a[6];
    const aw1 = a[7];
    const bx0 = b[0];
    const by0 = b[1];
    const bz0 = b[2];
    const bw0 = b[3];
    out[0] = ax0 * bw0 + aw0 * bx0 + ay0 * bz0 - az0 * by0;
    out[1] = ay0 * bw0 + aw0 * by0 + az0 * bx0 - ax0 * bz0;
    out[2] = az0 * bw0 + aw0 * bz0 + ax0 * by0 - ay0 * bx0;
    out[3] = aw0 * bw0 - ax0 * bx0 - ay0 * by0 - az0 * bz0;
    out[4] = ax0 * bw1 + aw0 * bx1 + ay0 * bz1 - az0 * by1 + ax1 * bw0 + aw1 * bx0 + ay1 * bz0 - az1 * by0;
    out[5] = ay0 * bw1 + aw0 * by1 + az0 * bx1 - ax0 * bz1 + ay1 * bw0 + aw1 * by0 + az1 * bx0 - ax1 * bz0;
    out[6] = az0 * bw1 + aw0 * bz1 + ax0 * by1 - ay0 * bx1 + az1 * bw0 + aw1 * bz0 + ax1 * by0 - ay1 * bx0;
    out[7] = aw0 * bw1 - ax0 * bx1 - ay0 * by1 - az0 * bz1 + aw1 * bw0 - ax1 * bx0 - ay1 * by0 - az1 * bz0;
    return out;
  }
  /**
   * Alias for {@link Quat2.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return out;
  }
  /**
   * Scales a {@link Quat2} by a scalar value
   * @category Static
   *
   * @param out - the receiving dual quaterion
   * @param a - the dual quaternion to scale
   * @param b - scalar value to scale the dual quaterion by
   * @returns `out`
   */
  static scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    out[3] = a[3] * b;
    out[4] = a[4] * b;
    out[5] = a[5] * b;
    out[6] = a[6] * b;
    out[7] = a[7] * b;
    return out;
  }
  /**
   * Calculates the dot product of two {@link Quat2}s (The dot product of the real parts)
   * @category Static
   *
   * @param a - the first operand
   * @param b - the second operand
   * @returns dot product of a and b
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static dot(a, b) {
    return 0;
  }
  /**
   * Performs a linear interpolation between two {@link Quat2}s
   * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when `t = 0.5`)
   * @category Static
   *
   * @param out - the receiving dual quat
   * @param a - the first operand
   * @param b - the second operand
   * @param t - interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a, b, t) {
    const mt = 1 - t;
    if (_Quat2.dot(a, b) < 0) {
      t = -t;
    }
    out[0] = a[0] * mt + b[0] * t;
    out[1] = a[1] * mt + b[1] * t;
    out[2] = a[2] * mt + b[2] * t;
    out[3] = a[3] * mt + b[3] * t;
    out[4] = a[4] * mt + b[4] * t;
    out[5] = a[5] * mt + b[5] * t;
    out[6] = a[6] * mt + b[6] * t;
    out[7] = a[7] * mt + b[7] * t;
    return out;
  }
  /**
   * Calculates the inverse of a {@link Quat2}. If they are normalized, conjugate is cheaper
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - dual quat to calculate inverse of
   * @returns `out`
   */
  static invert(out, a) {
    const sqlen = _Quat2.squaredLength(a);
    out[0] = -a[0] / sqlen;
    out[1] = -a[1] / sqlen;
    out[2] = -a[2] / sqlen;
    out[3] = a[3] / sqlen;
    out[4] = -a[4] / sqlen;
    out[5] = -a[5] / sqlen;
    out[6] = -a[6] / sqlen;
    out[7] = a[7] / sqlen;
    return out;
  }
  /**
   * Calculates the conjugate of a {@link Quat2}. If the dual quaternion is normalized, this function is faster than
   * {@link Quat2.invert} and produces the same result.
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - dual quaternion to calculate conjugate of
   * @returns `out`
   */
  static conjugate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    out[2] = -a[2];
    out[3] = a[3];
    out[4] = -a[4];
    out[5] = -a[5];
    out[6] = -a[6];
    out[7] = a[7];
    return out;
  }
  /**
   * Calculates the magnitude (length) of a {@link Quat2}
   * @category Static
   *
   * @param a - dual quaternion to calculate length of
   * @returns length of `a`
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static magnitude(a) {
    return 0;
  }
  /**
   * Alias for {@link Quat2.magnitude}
   * @category Static
   */
  static mag(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Quat2.magnitude}
   * @category Static
   * @deprecated Use {@link Quat2.magnitude} to avoid conflicts with builtin `length` methods/attribs
   */
  // Length conflicts with Function.length
  static length(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Quat2.magnitude}
   * @category Static
   * @deprecated Use {@link Quat2.mag}
   */
  static len(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared length of a {@link Quat2}
   * @category Static
   *
   * @param a - dual quaternion to calculate squared length of
   * @returns squared length of a
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static squaredLength(a) {
    return 0;
  }
  /**
   * Alias for {@link Quat2.squaredLength}
   * @category Static
   */
  static sqrLen(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Normalize a {@link Quat2}
   * @category Static
   *
   * @param out - the receiving dual quaternion
   * @param a - dual quaternion to normalize
   * @returns `out`
   */
  static normalize(out, a) {
    let magnitude = _Quat2.squaredLength(a);
    if (magnitude > 0) {
      magnitude = Math.sqrt(magnitude);
      const a0 = a[0] / magnitude;
      const a1 = a[1] / magnitude;
      const a2 = a[2] / magnitude;
      const a3 = a[3] / magnitude;
      const b0 = a[4];
      const b1 = a[5];
      const b2 = a[6];
      const b3 = a[7];
      const a_dot_b = a0 * b0 + a1 * b1 + a2 * b2 + a3 * b3;
      out[0] = a0;
      out[1] = a1;
      out[2] = a2;
      out[3] = a3;
      out[4] = (b0 - a0 * a_dot_b) / magnitude;
      out[5] = (b1 - a1 * a_dot_b) / magnitude;
      out[6] = (b2 - a2 * a_dot_b) / magnitude;
      out[7] = (b3 - a3 * a_dot_b) / magnitude;
    }
    return out;
  }
  /**
   * Returns a string representation of a {@link Quat2}
   * @category Static
   *
   * @param a - dual quaternion to represent as a string
   * @returns string representation of the vector
   */
  static str(a) {
    return `Quat2(${a.join(", ")})`;
  }
  /**
   * Returns whether the {@link Quat2}s have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first dual quaternion.
   * @param b - The second dual quaternion.
   * @returns True if the dual quaternions are equal, false otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4] && a[5] === b[5] && a[6] === b[6] && a[7] === b[7];
  }
  /**
   * Returns whether the {@link Quat2}s have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first dual quaternion.
   * @param b - The second dual quaternion.
   * @returns True if the dual quaternions are equal, false otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const a2 = a[2];
    const a3 = a[3];
    const a4 = a[4];
    const a5 = a[5];
    const a6 = a[6];
    const a7 = a[7];
    const b0 = b[0];
    const b1 = b[1];
    const b2 = b[2];
    const b3 = b[3];
    const b4 = b[4];
    const b5 = b[5];
    const b6 = b[6];
    const b7 = b[7];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1)) && Math.abs(a2 - b2) <= GLM_EPSILON * Math.max(1, Math.abs(a2), Math.abs(b2)) && Math.abs(a3 - b3) <= GLM_EPSILON * Math.max(1, Math.abs(a3), Math.abs(b3)) && Math.abs(a4 - b4) <= GLM_EPSILON * Math.max(1, Math.abs(a4), Math.abs(b4)) && Math.abs(a5 - b5) <= GLM_EPSILON * Math.max(1, Math.abs(a5), Math.abs(b5)) && Math.abs(a6 - b6) <= GLM_EPSILON * Math.max(1, Math.abs(a6), Math.abs(b6)) && Math.abs(a7 - b7) <= GLM_EPSILON * Math.max(1, Math.abs(a7), Math.abs(b7));
  }
};
Quat2.dot = Quat.dot;
Quat2.squaredLength = Quat.squaredLength;
Quat2.sqrLen = Quat.squaredLength;
Quat2.mag = Quat.magnitude;
Quat2.length = Quat.magnitude;
Quat2.len = Quat.magnitude;
Quat2.mul = Quat2.multiply;
var Vec2 = class _Vec2 extends Float32Array {
  /**
   * Create a {@link Vec2}.
   *
   * @category Constructor
   */
  constructor(...values) {
    switch (values.length) {
      case 2: {
        const v = values[0];
        if (typeof v === "number") {
          super([v, values[1]]);
        } else {
          super(v, values[1], 2);
        }
        break;
      }
      case 1: {
        const v = values[0];
        if (typeof v === "number") {
          super([v, v]);
        } else {
          super(v, 0, 2);
        }
        break;
      }
      default:
        super(2);
        break;
    }
  }
  // ============
  // Accessors
  // ============
  // Getters and setters to make component access read better.
  // These are likely to be a little bit slower than direct array access.
  /**
   * The x component of the vector. Equivalent to `this[0];`
   * @category Vector Components
   */
  get x() {
    return this[0];
  }
  set x(value) {
    this[0] = value;
  }
  /**
   * The y component of the vector. Equivalent to `this[1];`
   * @category Vector Components
   */
  get y() {
    return this[1];
  }
  set y(value) {
    this[1] = value;
  }
  // Alternate set of getters and setters in case this is being used to define
  // a color.
  /**
   * The r component of the vector. Equivalent to `this[0];`
   * @category Color Components
   */
  get r() {
    return this[0];
  }
  set r(value) {
    this[0] = value;
  }
  /**
   * The g component of the vector. Equivalent to `this[1];`
   * @category Color Components
   */
  get g() {
    return this[1];
  }
  set g(value) {
    this[1] = value;
  }
  /**
   * The magnitude (length) of this.
   * Equivalent to `Vec2.magnitude(this);`
   *
   * Magnitude is used because the `length` attribute is already defined by
   * TypedArrays to mean the number of elements in the array.
   *
   * @category Accessors
   */
  get magnitude() {
    return Math.hypot(this[0], this[1]);
  }
  /**
   * Alias for {@link Vec2.magnitude}
   *
   * @category Accessors
   */
  get mag() {
    return this.magnitude;
  }
  /**
   * The squared magnitude (length) of `this`.
   * Equivalent to `Vec2.squaredMagnitude(this);`
   *
   * @category Accessors
   */
  get squaredMagnitude() {
    const x = this[0];
    const y = this[1];
    return x * x + y * y;
  }
  /**
   * Alias for {@link Vec2.squaredMagnitude}
   *
   * @category Accessors
   */
  get sqrMag() {
    return this.squaredMagnitude;
  }
  /**
   * A string representation of `this`
   * Equivalent to `Vec2.str(this);`
   *
   * @category Accessors
   */
  get str() {
    return _Vec2.str(this);
  }
  // ===================
  // Instances methods
  // ===================
  /**
   * Copy the values from another {@link Vec2} into `this`.
   * @category Methods
   *
   * @param a the source vector
   * @returns `this`
   */
  copy(a) {
    this.set(a);
    return this;
  }
  // Instead of zero(), use a.fill(0) for instances;
  /**
   * Adds a {@link Vec2} to `this`.
   * Equivalent to `Vec2.add(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to add to `this`
   * @returns `this`
   */
  add(b) {
    this[0] += b[0];
    this[1] += b[1];
    return this;
  }
  /**
   * Subtracts a {@link Vec2} from `this`.
   * Equivalent to `Vec2.subtract(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to subtract from `this`
   * @returns `this`
   */
  subtract(b) {
    this[0] -= b[0];
    this[1] -= b[1];
    return this;
  }
  /**
   * Alias for {@link Vec2.subtract}
   * @category Methods
   */
  sub(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Multiplies `this` by a {@link Vec2}.
   * Equivalent to `Vec2.multiply(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to multiply `this` by
   * @returns `this`
   */
  multiply(b) {
    this[0] *= b[0];
    this[1] *= b[1];
    return this;
  }
  /**
   * Alias for {@link Vec2.multiply}
   * @category Methods
   */
  mul(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Divides `this` by a {@link Vec2}.
   * Equivalent to `Vec2.divide(this, this, b);`
   * @category Methods
   *
   * @param b - The vector to divide `this` by
   * @returns `this`
   */
  divide(b) {
    this[0] /= b[0];
    this[1] /= b[1];
    return this;
  }
  /**
   * Alias for {@link Vec2.divide}
   * @category Methods
   */
  div(b) {
    return this;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Scales `this` by a scalar number.
   * Equivalent to `Vec2.scale(this, this, b);`
   * @category Methods
   *
   * @param b - Amount to scale `this` by
   * @returns `this`
   */
  scale(b) {
    this[0] *= b;
    this[1] *= b;
    return this;
  }
  /**
   * Calculates `this` scaled by a scalar value then adds the result to `this`.
   * Equivalent to `Vec2.scaleAndAdd(this, this, b, scale);`
   * @category Methods
   *
   * @param b - The vector to add to `this`
   * @param scale - The amount to scale `b` by before adding
   * @returns `this`
   */
  scaleAndAdd(b, scale) {
    this[0] += b[0] * scale;
    this[1] += b[1] * scale;
    return this;
  }
  /**
   * Calculates the Euclidean distance between another {@link Vec2} and `this`.
   * Equivalent to `Vec2.distance(this, b);`
   * @category Methods
   *
   * @param b - The vector to calculate the distance to
   * @returns Distance between `this` and `b`
   */
  distance(b) {
    return _Vec2.distance(this, b);
  }
  /**
   * Alias for {@link Vec2.distance}
   * @category Methods
   */
  dist(b) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared Euclidean distance between another {@link Vec2} and `this`.
   * Equivalent to `Vec2.squaredDistance(this, b);`
   * @category Methods
   *
   * @param b The vector to calculate the squared distance to
   * @returns Squared distance between `this` and `b`
   */
  squaredDistance(b) {
    return _Vec2.squaredDistance(this, b);
  }
  /**
   * Alias for {@link Vec2.squaredDistance}
   * @category Methods
   */
  sqrDist(b) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Negates the components of `this`.
   * Equivalent to `Vec2.negate(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  negate() {
    this[0] *= -1;
    this[1] *= -1;
    return this;
  }
  /**
   * Inverts the components of `this`.
   * Equivalent to `Vec2.inverse(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  invert() {
    this[0] = 1 / this[0];
    this[1] = 1 / this[1];
    return this;
  }
  /**
   * Sets each component of `this` to it's absolute value.
   * Equivalent to `Vec2.abs(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  abs() {
    this[0] = Math.abs(this[0]);
    this[1] = Math.abs(this[1]);
    return this;
  }
  /**
   * Calculates the dot product of this and another {@link Vec2}.
   * Equivalent to `Vec2.dot(this, b);`
   * @category Methods
   *
   * @param b - The second operand
   * @returns Dot product of `this` and `b`
   */
  dot(b) {
    return this[0] * b[0] + this[1] * b[1];
  }
  /**
   * Normalize `this`.
   * Equivalent to `Vec2.normalize(this, this);`
   * @category Methods
   *
   * @returns `this`
   */
  normalize() {
    return _Vec2.normalize(this, this);
  }
  // ===================
  // Static accessors
  // ===================
  /**
   * @category Static
   *
   * @returns The number of bytes in a {@link Vec2}.
   */
  static get BYTE_LENGTH() {
    return 2 * Float32Array.BYTES_PER_ELEMENT;
  }
  // ===================
  // Static methods
  // ===================
  /**
   * Creates a new, empty {@link Vec2}
   * @category Static
   *
   * @returns A new 2D vector
   */
  static create() {
    return new _Vec2();
  }
  /**
   * Creates a new {@link Vec2} initialized with values from an existing vector
   * @category Static
   *
   * @param a - Vector to clone
   * @returns A new 2D vector
   */
  static clone(a) {
    return new _Vec2(a);
  }
  /**
   * Creates a new {@link Vec2} initialized with the given values
   * @category Static
   *
   * @param x - X component
   * @param y - Y component
   * @returns A new 2D vector
   */
  static fromValues(x, y) {
    return new _Vec2(x, y);
  }
  /**
   * Copy the values from one {@link Vec2} to another
   * @category Static
   *
   * @param out - the receiving vector
   * @param a - The source vector
   * @returns `out`
   */
  static copy(out, a) {
    out[0] = a[0];
    out[1] = a[1];
    return out;
  }
  /**
   * Set the components of a {@link Vec2} to the given values
   * @category Static
   *
   * @param out - The receiving vector
   * @param x - X component
   * @param y - Y component
   * @returns `out`
   */
  static set(out, x, y) {
    out[0] = x;
    out[1] = y;
    return out;
  }
  /**
   * Adds two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static add(out, a, b) {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    return out;
  }
  /**
   * Subtracts vector b from vector a
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static subtract(out, a, b) {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    return out;
  }
  /**
   * Alias for {@link Vec2.subtract}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sub(out, a, b) {
    return [0, 0];
  }
  /**
   * Multiplies two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static multiply(out, a, b) {
    out[0] = a[0] * b[0];
    out[1] = a[1] * b[1];
    return out;
  }
  /**
   * Alias for {@link Vec2.multiply}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static mul(out, a, b) {
    return [0, 0];
  }
  /**
   * Divides two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static divide(out, a, b) {
    out[0] = a[0] / b[0];
    out[1] = a[1] / b[1];
    return out;
  }
  /**
   * Alias for {@link Vec2.divide}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static div(out, a, b) {
    return [0, 0];
  }
  /**
   * Math.ceil the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to ceil
   * @returns `out`
   */
  static ceil(out, a) {
    out[0] = Math.ceil(a[0]);
    out[1] = Math.ceil(a[1]);
    return out;
  }
  /**
   * Math.floor the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to floor
   * @returns `out`
   */
  static floor(out, a) {
    out[0] = Math.floor(a[0]);
    out[1] = Math.floor(a[1]);
    return out;
  }
  /**
   * Returns the minimum of two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static min(out, a, b) {
    out[0] = Math.min(a[0], b[0]);
    out[1] = Math.min(a[1], b[1]);
    return out;
  }
  /**
   * Returns the maximum of two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static max(out, a, b) {
    out[0] = Math.max(a[0], b[0]);
    out[1] = Math.max(a[1], b[1]);
    return out;
  }
  /**
   * Math.round the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to round
   * @returns `out`
   */
  static round(out, a) {
    out[0] = Math.round(a[0]);
    out[1] = Math.round(a[1]);
    return out;
  }
  /**
   * Scales a {@link Vec2} by a scalar number
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The vector to scale
   * @param b - Amount to scale the vector by
   * @returns `out`
   */
  static scale(out, a, b) {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    return out;
  }
  /**
   * Adds two Vec2's after scaling the second operand by a scalar value
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @param scale - The amount to scale b by before adding
   * @returns `out`
   */
  static scaleAndAdd(out, a, b, scale) {
    out[0] = a[0] + b[0] * scale;
    out[1] = a[1] + b[1] * scale;
    return out;
  }
  /**
   * Calculates the Euclidean distance between two {@link Vec2}s
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns distance between `a` and `b`
   */
  static distance(a, b) {
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  /**
   * Alias for {@link Vec2.distance}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static dist(a, b) {
    return 0;
  }
  /**
   * Calculates the squared Euclidean distance between two {@link Vec2}s
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns Squared distance between `a` and `b`
   */
  static squaredDistance(a, b) {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    return x * x + y * y;
  }
  /**
   * Alias for {@link Vec2.distance}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sqrDist(a, b) {
    return 0;
  }
  /**
   * Calculates the magnitude (length) of a {@link Vec2}
   * @category Static
   *
   * @param a - Vector to calculate magnitude of
   * @returns Magnitude of a
   */
  static magnitude(a) {
    const x = a[0];
    const y = a[1];
    return Math.sqrt(x * x + y * y);
  }
  /**
   * Alias for {@link Vec2.magnitude}
   * @category Static
   */
  static mag(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Vec2.magnitude}
   * @category Static
   * @deprecated Use {@link Vec2.magnitude} to avoid conflicts with builtin `length` methods/attribs
   *
   * @param a - vector to calculate length of
   * @returns length of a
   */
  // Length conflicts with Function.length
  static length(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Alias for {@link Vec2.magnitude}
   * @category Static
   * @deprecated Use {@link Vec2.mag}
   */
  static len(a) {
    return 0;
  }
  // eslint-disable-line @typescript-eslint/no-unused-vars
  /**
   * Calculates the squared length of a {@link Vec2}
   * @category Static
   *
   * @param a - Vector to calculate squared length of
   * @returns Squared length of a
   */
  static squaredLength(a) {
    const x = a[0];
    const y = a[1];
    return x * x + y * y;
  }
  /**
   * Alias for {@link Vec2.squaredLength}
   * @category Static
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static sqrLen(a, b) {
    return 0;
  }
  /**
   * Negates the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to negate
   * @returns `out`
   */
  static negate(out, a) {
    out[0] = -a[0];
    out[1] = -a[1];
    return out;
  }
  /**
   * Returns the inverse of the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to invert
   * @returns `out`
   */
  static inverse(out, a) {
    out[0] = 1 / a[0];
    out[1] = 1 / a[1];
    return out;
  }
  /**
   * Returns the absolute value of the components of a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to compute the absolute values of
   * @returns `out`
   */
  static abs(out, a) {
    out[0] = Math.abs(a[0]);
    out[1] = Math.abs(a[1]);
    return out;
  }
  /**
   * Normalize a {@link Vec2}
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - Vector to normalize
   * @returns `out`
   */
  static normalize(out, a) {
    const x = a[0];
    const y = a[1];
    let len = x * x + y * y;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
    }
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    return out;
  }
  /**
   * Calculates the dot product of two {@link Vec2}s
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns Dot product of `a` and `b`
   */
  static dot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  /**
   * Computes the cross product of two {@link Vec2}s
   * Note that the cross product must by definition produce a 3D vector.
   * For this reason there is also not instance equivalent for this function.
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @returns `out`
   */
  static cross(out, a, b) {
    const z = a[0] * b[1] - a[1] * b[0];
    out[0] = out[1] = 0;
    out[2] = z;
    return out;
  }
  /**
   * Performs a linear interpolation between two {@link Vec2}s
   * @category Static
   *
   * @param out - The receiving vector
   * @param a - The first operand
   * @param b - The second operand
   * @param t - Interpolation amount, in the range [0-1], between the two inputs
   * @returns `out`
   */
  static lerp(out, a, b, t) {
    const ax = a[0];
    const ay = a[1];
    out[0] = ax + t * (b[0] - ax);
    out[1] = ay + t * (b[1] - ay);
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat2}
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   * @category Static
   */
  static transformMat2(out, a, m) {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[2] * y;
    out[1] = m[1] * x + m[3] * y;
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat2d}
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   * @category Static
   */
  static transformMat2d(out, a, m) {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[2] * y + m[4];
    out[1] = m[1] * x + m[3] * y + m[5];
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat3}
   * 3rd vector component is implicitly '1'
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   * @category Static
   */
  static transformMat3(out, a, m) {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[3] * y + m[6];
    out[1] = m[1] * x + m[4] * y + m[7];
    return out;
  }
  /**
   * Transforms the {@link Vec2} with a {@link Mat4}
   * 3rd vector component is implicitly '0'
   * 4th vector component is implicitly '1'
   *
   * @param out - The receiving vector
   * @param a - The vector to transform
   * @param m - Matrix to transform with
   * @returns `out`
   * @category Static
   */
  static transformMat4(out, a, m) {
    const x = a[0];
    const y = a[1];
    out[0] = m[0] * x + m[4] * y + m[12];
    out[1] = m[1] * x + m[5] * y + m[13];
    return out;
  }
  /**
   * Rotate a 2D vector
   * @category Static
   *
   * @param out - The receiving {@link Vec2}
   * @param a - The {@link Vec2} point to rotate
   * @param b - The origin of the rotation
   * @param rad - The angle of rotation in radians
   * @returns `out`
   */
  static rotate(out, a, b, rad) {
    const p0 = a[0] - b[0];
    const p1 = a[1] - b[1];
    const sinC = Math.sin(rad);
    const cosC = Math.cos(rad);
    out[0] = p0 * cosC - p1 * sinC + b[0];
    out[1] = p0 * sinC + p1 * cosC + b[1];
    return out;
  }
  /**
   * Get the angle between two 2D vectors
   * @category Static
   *
   * @param a - The first operand
   * @param b - The second operand
   * @returns The angle in radians
   */
  static angle(a, b) {
    const x1 = a[0];
    const y1 = a[1];
    const x2 = b[0];
    const y2 = b[1];
    const mag = Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2);
    const cosine = mag && (x1 * x2 + y1 * y2) / mag;
    return Math.acos(Math.min(Math.max(cosine, -1), 1));
  }
  /**
   * Set the components of a {@link Vec2} to zero
   * @category Static
   *
   * @param out - The receiving vector
   * @returns `out`
   */
  static zero(out) {
    out[0] = 0;
    out[1] = 0;
    return out;
  }
  /**
   * Returns whether the vectors have exactly the same elements in the same position (when compared with ===)
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns `true` if the vectors components are ===, `false` otherwise.
   */
  static exactEquals(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }
  /**
   * Returns whether the vectors have approximately the same elements in the same position.
   * @category Static
   *
   * @param a - The first vector.
   * @param b - The second vector.
   * @returns `true` if the vectors are approximately equal, `false` otherwise.
   */
  static equals(a, b) {
    const a0 = a[0];
    const a1 = a[1];
    const b0 = b[0];
    const b1 = b[1];
    return Math.abs(a0 - b0) <= GLM_EPSILON * Math.max(1, Math.abs(a0), Math.abs(b0)) && Math.abs(a1 - b1) <= GLM_EPSILON * Math.max(1, Math.abs(a1), Math.abs(b1));
  }
  /**
   * Returns a string representation of a vector
   * @category Static
   *
   * @param a - Vector to represent as a string
   * @returns String representation of the vector
   */
  static str(a) {
    return `Vec2(${a.join(", ")})`;
  }
};
Vec2.prototype.sub = Vec2.prototype.subtract;
Vec2.prototype.mul = Vec2.prototype.multiply;
Vec2.prototype.div = Vec2.prototype.divide;
Vec2.prototype.dist = Vec2.prototype.distance;
Vec2.prototype.sqrDist = Vec2.prototype.squaredDistance;
Vec2.sub = Vec2.subtract;
Vec2.mul = Vec2.multiply;
Vec2.div = Vec2.divide;
Vec2.dist = Vec2.distance;
Vec2.sqrDist = Vec2.squaredDistance;
Vec2.sqrLen = Vec2.squaredLength;
Vec2.mag = Vec2.magnitude;
Vec2.length = Vec2.magnitude;
Vec2.len = Vec2.magnitude;

// node_modules/@typhonjs-fvtt/runtime/_dist/util/animate/index.js
async function nextAnimationFrame(cntr = 1) {
  if (!Number.isInteger(cntr) || cntr < 1) {
    throw new TypeError(`nextAnimationFrame error: 'cntr' must be a positive integer greater than 0.`);
  }
  let currentTime;
  for (; --cntr >= 0; ) {
    currentTime = await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return currentTime;
}

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/store/position/index.js
function draggable(node, { position, enabled = true, button = 0, storeDragging = void 0, tween = false, tweenOptions = { duration: 1, ease: "cubicOut" }, hasTargetClassList, ignoreTargetClassList }) {
  if (hasTargetClassList !== void 0 && !isIterable(hasTargetClassList)) {
    throw new TypeError(`'hasTargetClassList' is not iterable.`);
  }
  if (ignoreTargetClassList !== void 0 && !isIterable(ignoreTargetClassList)) {
    throw new TypeError(`'ignoreTargetClassList' is not iterable.`);
  }
  const positionData = { left: 0, top: 0 };
  let actualPosition = position?.position ?? position;
  let initialPosition = null;
  let initialDragPoint = { x: 0, y: 0 };
  let dragging = false;
  let quickTo = actualPosition.animate.quickTo(["top", "left"], tweenOptions);
  const handlers = {
    dragDown: ["pointerdown", onDragPointerDown, false],
    dragMove: ["pointermove", onDragPointerChange, false],
    dragUp: ["pointerup", onDragPointerUp, false]
  };
  function activateListeners() {
    node.addEventListener(...handlers.dragDown);
    node.classList.add("draggable");
  }
  function removeListeners() {
    if (typeof storeDragging?.set === "function") {
      storeDragging.set(false);
    }
    node.removeEventListener(...handlers.dragDown);
    node.removeEventListener(...handlers.dragMove);
    node.removeEventListener(...handlers.dragUp);
    node.classList.remove("draggable");
  }
  if (enabled) {
    activateListeners();
  }
  function onDragPointerDown(event) {
    if (event.button !== button || !event.isPrimary) {
      return;
    }
    if (!actualPosition.enabled) {
      return;
    }
    if (ignoreTargetClassList !== void 0 && A11yHelper.isFocusTarget(event.target)) {
      for (const targetClass of ignoreTargetClassList) {
        if (event.target.classList.contains(targetClass)) {
          return;
        }
      }
    }
    if (hasTargetClassList !== void 0 && A11yHelper.isFocusTarget(event.target)) {
      let foundTarget = false;
      for (const targetClass of hasTargetClassList) {
        if (event.target.classList.contains(targetClass)) {
          foundTarget = true;
          break;
        }
      }
      if (!foundTarget) {
        return;
      }
    }
    event.preventDefault();
    dragging = false;
    initialPosition = actualPosition.get();
    initialDragPoint = { x: event.clientX, y: event.clientY };
    node.addEventListener(...handlers.dragMove);
    node.addEventListener(...handlers.dragUp);
    node.setPointerCapture(event.pointerId);
  }
  function onDragPointerChange(event) {
    if ((event.buttons & 1) === 0) {
      onDragPointerUp(event);
      return;
    }
    if (event.button !== -1 || !event.isPrimary) {
      return;
    }
    event.preventDefault();
    if (!dragging && typeof storeDragging?.set === "function") {
      dragging = true;
      storeDragging.set(true);
    }
    const newLeft = initialPosition?.left + (event.clientX - initialDragPoint.x);
    const newTop = initialPosition?.top + (event.clientY - initialDragPoint.y);
    if (tween) {
      quickTo(newTop, newLeft);
    } else {
      positionData.left = newLeft;
      positionData.top = newTop;
      actualPosition.set(positionData);
    }
  }
  function onDragPointerUp(event) {
    event.preventDefault();
    dragging = false;
    if (typeof storeDragging?.set === "function") {
      storeDragging.set(false);
    }
    node.removeEventListener(...handlers.dragMove);
    node.removeEventListener(...handlers.dragUp);
  }
  return {
    // The default of enabled being true won't automatically add listeners twice.
    update: (options) => {
      if (options.position !== void 0) {
        const newPosition = options.position?.position ?? options.position;
        if (newPosition !== actualPosition) {
          actualPosition = newPosition;
          quickTo = actualPosition.animate.quickTo(["top", "left"], tweenOptions);
        }
      }
      if (typeof options.enabled === "boolean") {
        enabled = options.enabled;
        if (enabled) {
          activateListeners();
        } else {
          removeListeners();
        }
      }
      if (typeof options.button === "number") {
        button = options.button;
      }
      if (typeof options.tween === "boolean") {
        tween = options.tween;
      }
      if (isObject(options.tweenOptions)) {
        tweenOptions = options.tweenOptions;
        quickTo.options(tweenOptions);
      }
      if (options.hasTargetClassList !== void 0) {
        if (!isIterable(options.hasTargetClassList)) {
          throw new TypeError(`'hasTargetClassList' is not iterable.`);
        } else {
          hasTargetClassList = options.hasTargetClassList;
        }
      }
      if (options.ignoreTargetClassList !== void 0) {
        if (!isIterable(options.ignoreTargetClassList)) {
          throw new TypeError(`'ignoreTargetClassList' is not iterable.`);
        } else {
          ignoreTargetClassList = options.ignoreTargetClassList;
        }
      }
    },
    destroy: () => removeListeners()
  };
}
var DraggableOptionsStore = class {
  tween;
  tweenOptions;
  #initialTween;
  /**
   */
  #initialTweenOptions;
  #tween = false;
  /**
   */
  #tweenOptions = { duration: 1, ease: "cubicOut" };
  /**
   * Stores the subscribers.
   */
  #subscribers = [];
  /**
   * @param [opts] - Optional parameters.
   *
   * @param [opts.tween = false] - Tween enabled.
   *
   * @param [opts.tweenOptions] - Quick tween options.
   */
  constructor({ tween = false, tweenOptions } = {}) {
    Object.defineProperty(this, "tween", {
      get: () => {
        return this.#tween;
      },
      set: (newTween) => {
        if (typeof newTween !== "boolean") {
          throw new TypeError(`'tween' is not a boolean.`);
        }
        this.#tween = newTween;
        this.#updateSubscribers();
      },
      enumerable: true
    });
    Object.defineProperty(this, "tweenOptions", {
      get: () => {
        return this.#tweenOptions;
      },
      set: (newTweenOptions) => {
        if (!isObject(newTweenOptions)) {
          throw new TypeError(`'tweenOptions' is not an object.`);
        }
        if (newTweenOptions.duration !== void 0) {
          if (!Number.isFinite(newTweenOptions.duration)) {
            throw new TypeError(`'tweenOptions.duration' is not a finite number.`);
          }
          if (newTweenOptions.duration < 0) {
            this.#tweenOptions.duration = 0;
          } else {
            this.#tweenOptions.duration = newTweenOptions.duration;
          }
        }
        if (newTweenOptions.ease !== void 0) {
          const easeFn = getEasingFunc(newTweenOptions.ease);
          if (typeof easeFn !== "function") {
            throw new TypeError(`'tweenOptions.ease' is not a function or Svelte easing function name.`);
          }
          this.#tweenOptions.ease = newTweenOptions.ease;
        }
        this.#updateSubscribers();
      },
      enumerable: true
    });
    if (tween !== void 0) {
      this.tween = tween;
    }
    if (tweenOptions !== void 0) {
      this.tweenOptions = tweenOptions;
    }
    this.#initialTween = this.#tween;
    this.#initialTweenOptions = Object.assign({}, this.#tweenOptions);
  }
  /**
   * @returns Get tween duration.
   */
  get tweenDuration() {
    return this.#tweenOptions.duration;
  }
  /**
   * @returns Get easing function or easing function name.
   */
  get tweenEase() {
    return this.#tweenOptions.ease;
  }
  /**
   * @param duration - Set tween duration.
   */
  set tweenDuration(duration) {
    if (!Number.isFinite(duration)) {
      throw new TypeError(`'duration' is not a finite number.`);
    }
    if (duration < 0) {
      duration = 0;
    }
    this.#tweenOptions.duration = duration;
    this.#updateSubscribers();
  }
  /**
   * @param ease - Set easing function by name or direct function.
   */
  set tweenEase(ease) {
    const easeFn = getEasingFunc(ease);
    if (typeof easeFn !== "function") {
      throw new TypeError(`'ease' is not a function or Svelte easing function name.`);
    }
    this.#tweenOptions.ease = ease;
    this.#updateSubscribers();
  }
  /**
   * Resets all options data to initial values.
   */
  reset() {
    this.#tween = this.#initialTween;
    this.#tweenOptions = Object.assign({}, this.#initialTweenOptions);
    this.#updateSubscribers();
  }
  /**
   * Resets tween enabled state to initial value.
   */
  resetTween() {
    this.#tween = this.#initialTween;
    this.#updateSubscribers();
  }
  /**
   * Resets tween options to initial values.
   */
  resetTweenOptions() {
    this.#tweenOptions = Object.assign({}, this.#initialTweenOptions);
    this.#updateSubscribers();
  }
  /**
   * Store subscribe method.
   *
   * @param handler - Callback function that is invoked on update / changes. Receives the DraggableOptionsStore
   *        instance.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      handler(this);
    }
    return () => {
      const existingIdx = this.#subscribers.findIndex((entry) => entry === handler);
      if (existingIdx !== -1) {
        this.#subscribers.splice(existingIdx, 1);
      }
    };
  }
  #updateSubscribers() {
    const subscriptions = this.#subscribers;
    if (subscriptions.length > 0) {
      for (let cntr = 0; cntr < subscriptions.length; cntr++) {
        subscriptions[cntr](this);
      }
    }
  }
};
draggable.options = (options) => new DraggableOptionsStore(options);
var AnimationControl = class _AnimationControl {
  /**
   */
  #animationData;
  /**
   */
  #finishedPromise;
  /**
   */
  #willFinish;
  /**
   * Defines a static empty / void animation control.
   */
  static #voidControl = new _AnimationControl(null);
  /**
   * Provides a static void / undefined AnimationControl that is automatically resolved.
   */
  static get voidControl() {
    return this.#voidControl;
  }
  /**
   * @param [animationData] - Animation data.
   *
   * @param [willFinish] - Promise that tracks animation finished state.
   */
  constructor(animationData, willFinish = false) {
    this.#animationData = animationData;
    this.#willFinish = willFinish;
    if (isObject(animationData)) {
      animationData.control = this;
    }
  }
  /**
   * Get a promise that resolves when animation is finished.
   *
   * @returns Animation finished Promise.
   */
  get finished() {
    if (!CrossWindow.isPromise(this.#finishedPromise)) {
      this.#finishedPromise = this.#willFinish ? new Promise((resolve) => this.#animationData.resolve = resolve) : Promise.resolve({ cancelled: false });
    }
    return this.#finishedPromise;
  }
  /**
   * Returns whether this animation is currently active / animating.
   *
   * Note: a delayed animation may not be started / active yet. Use {@link AnimationControl.isFinished} to determine
   * if an animation is actually finished.
   *
   * @returns Animation active state.
   */
  get isActive() {
    return this.#animationData?.active ?? false;
  }
  /**
   * Returns whether this animation is completely finished.
   *
   * @returns Animation finished state.
   */
  get isFinished() {
    return this.#animationData?.finished ?? true;
  }
  /**
   * Cancels the animation.
   */
  cancel() {
    const animationData = this.#animationData;
    if (animationData === null || animationData === void 0) {
      return;
    }
    animationData.cancelled = true;
  }
};
var AnimationManager = class _AnimationManager {
  /**
   * Cancels all animations except `quickTo` animations.
   */
  static cancelFn = (data) => data?.quickTo !== true;
  /**
   * Cancels all animations.
   */
  static cancelAllFn = () => true;
  /**
   * Defines the options used for {@link TJSPosition.set}.
   */
  static #tjsPositionSetOptions = Object.freeze({ immediateElementUpdate: true });
  /**
   */
  static #activeList = [];
  /**
   * Provides the `this` context for {@link AnimationManager.animate} to be scheduled on rAF.
   */
  static #animateBound = (timeFrame) => this.animate(timeFrame);
  /**
   */
  static #pendingList = [];
  /**
   * Tracks whether a requestAnimationFrame callback is pending via {@link AnimationManager.add};
   */
  static #rafPending = false;
  /**
   * Time of last `rAF` callback.
   */
  static #timeFrame;
  /**
   * Time of `performance.now()` at last `rAF` callback.
   */
  static #timeNow;
  /**
   * @returns Time of last `rAF` callback.
   */
  static get timeFrame() {
    return this.#timeFrame;
  }
  /**
   * @returns Time of `performance.now()` at last `rAF` callback.
   */
  static get timeNow() {
    return this.#timeNow;
  }
  /**
   * Add animation data.
   *
   * @param data -
   */
  static add(data) {
    if (data.cancelled) {
      this.#cleanupData(data);
      return;
    }
    _AnimationManager.#pendingList.push(data);
    if (!_AnimationManager.#rafPending) {
      _AnimationManager.#rafPending = true;
      globalThis.requestAnimationFrame(this.#animateBound);
    }
  }
  /**
   * Manage all animation.
   *
   * @param timeFrame - rAF callback time.
   */
  static animate(timeFrame) {
    _AnimationManager.#rafPending = false;
    _AnimationManager.#timeNow = globalThis.performance.now();
    _AnimationManager.#timeFrame = timeFrame;
    if (_AnimationManager.#activeList.length === 0 && _AnimationManager.#pendingList.length === 0) {
      return;
    }
    if (_AnimationManager.#pendingList.length) {
      for (let cntr = _AnimationManager.#pendingList.length; --cntr >= 0; ) {
        const data = _AnimationManager.#pendingList[cntr];
        if (data.cancelled || data.el !== void 0 && !data.el.isConnected) {
          _AnimationManager.#pendingList.splice(cntr, 1);
          this.#cleanupData(data);
        }
        if (data.active) {
          if (data.transformOrigin) {
            data.position.set({ transformOrigin: data.transformOrigin });
          }
          data.start = _AnimationManager.#timeFrame;
          _AnimationManager.#pendingList.splice(cntr, 1);
          _AnimationManager.#activeList.push(data);
        }
      }
    }
    for (let cntr = _AnimationManager.#activeList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#activeList[cntr];
      if (data.cancelled || data.el !== void 0 && !data.el.isConnected) {
        _AnimationManager.#activeList.splice(cntr, 1);
        this.#cleanupData(data);
        continue;
      }
      data.current = timeFrame - data.start;
      if (data.current >= data.duration) {
        for (let dataCntr = data.keys.length; --dataCntr >= 0; ) {
          const key = data.keys[dataCntr];
          data.newData[key] = data.destination[key];
        }
        data.position.set(data.newData, _AnimationManager.#tjsPositionSetOptions);
        _AnimationManager.#activeList.splice(cntr, 1);
        this.#cleanupData(data);
        continue;
      }
      const easedTime = data.ease(data.current / data.duration);
      for (let dataCntr = data.keys.length; --dataCntr >= 0; ) {
        const key = data.keys[dataCntr];
        data.newData[key] = data.interpolate(data.initial[key], data.destination[key], easedTime);
      }
      data.position.set(data.newData, _AnimationManager.#tjsPositionSetOptions);
    }
    globalThis.requestAnimationFrame(this.#animateBound);
  }
  /**
   * Cancels all animations for given TJSPosition instance.
   *
   * @param position - TJSPosition instance.
   *
   * @param [cancelFn] - An optional function to control cancelling animations.
   */
  static cancel(position, cancelFn = _AnimationManager.cancelFn) {
    for (let cntr = _AnimationManager.#activeList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#activeList[cntr];
      if (data.cancelable && data.position === position && cancelFn(data)) {
        _AnimationManager.#activeList.splice(cntr, 1);
        data.cancelled = true;
        this.#cleanupData(data);
      }
    }
    for (let cntr = _AnimationManager.#pendingList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#pendingList[cntr];
      if (data.cancelable && data.position === position && cancelFn(data)) {
        _AnimationManager.#pendingList.splice(cntr, 1);
        data.cancelled = true;
        this.#cleanupData(data);
      }
    }
  }
  /**
   * Cancels all active and delayed animations.
   */
  static cancelAll() {
    for (let cntr = _AnimationManager.#activeList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#activeList[cntr];
      data.cancelled = true;
      this.#cleanupData(data);
    }
    for (let cntr = _AnimationManager.#pendingList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#pendingList[cntr];
      data.cancelled = true;
      this.#cleanupData(data);
    }
    _AnimationManager.#activeList.length = 0;
    _AnimationManager.#pendingList.length = 0;
  }
  /**
   * @param data - Animation data to cleanup.
   */
  static #cleanupData(data) {
    data.active = false;
    data.finished = true;
    if (data.transformOriginInitial) {
      data.position.set({ transformOrigin: data.transformOriginInitial });
    }
    if (typeof data.cleanup === "function") {
      data.cleanup(data);
    }
    if (typeof data.resolve === "function") {
      data.resolve({ cancelled: data.cancelled });
    }
    if (!data.quickTo) {
      data.cleanup = void 0;
      data.control = void 0;
      data.destination = void 0;
      data.el = void 0;
      data.ease = void 0;
      data.initial = void 0;
      data.interpolate = void 0;
      data.keys = void 0;
      data.newData = void 0;
      data.position = void 0;
      data.resolve = void 0;
    }
  }
  /**
   * Gets all {@link AnimationControl} instances for a given TJSPosition instance.
   *
   * @param position - TJSPosition instance.
   *
   * @returns All scheduled AnimationControl instances for the given TJSPosition instance.
   */
  static getScheduled(position) {
    const results = [];
    for (let cntr = _AnimationManager.#activeList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#activeList[cntr];
      if (data.position === position && data.control) {
        results.push(data.control);
      }
    }
    for (let cntr = _AnimationManager.#pendingList.length; --cntr >= 0; ) {
      const data = _AnimationManager.#pendingList[cntr];
      if (data.position === position && data.control) {
        results.push(data.control);
      }
    }
    return results;
  }
  /**
   * Returns the status of any scheduled or pending animations for the given {@link TJSPosition} instance.
   *
   * @param position - TJSPosition instance.
   *
   * @param [options] - Scheduling options.
   *
   * @returns True if scheduled / false if not.
   */
  static isScheduled(position, { active = true, pending = true } = {}) {
    if (active) {
      for (let cntr = _AnimationManager.#activeList.length; --cntr >= 0; ) {
        if (_AnimationManager.#activeList[cntr].position === position) {
          return true;
        }
      }
    }
    if (pending) {
      for (let cntr = _AnimationManager.#pendingList.length; --cntr >= 0; ) {
        if (_AnimationManager.#pendingList[cntr].position === position) {
          return true;
        }
      }
    }
    return false;
  }
};
var TJSPositionData = class {
  height;
  left;
  maxHeight;
  maxWidth;
  minHeight;
  minWidth;
  rotateX;
  rotateY;
  rotateZ;
  scale;
  top;
  transformOrigin;
  translateX;
  translateY;
  translateZ;
  width;
  zIndex;
  /**
   * @param [opts] - Options.
   *
   * @param [opts.height] -
   *
   * @param [opts.left] -
   *
   * @param [opts.maxHeight] -
   *
   * @param [opts.maxWidth] -
   *
   * @param [opts.minHeight] -
   *
   * @param [opts.minWidth] -
   *
   * @param [opts.rotateX] -
   *
   * @param [opts.rotateY] -
   *
   * @param [opts.rotateZ] -
   *
   * @param [opts.scale] -
   *
   * @param [opts.translateX] -
   *
   * @param [opts.translateY] -
   *
   * @param [opts.translateZ] -
   *
   * @param [opts.top] -
   *
   * @param [opts.transformOrigin] -
   *
   * @param [opts.width] -
   *
   * @param [opts.zIndex] -
   */
  constructor({ height = null, left = null, maxHeight = null, maxWidth = null, minHeight = null, minWidth = null, rotateX = null, rotateY = null, rotateZ = null, scale = null, translateX = null, translateY = null, translateZ = null, top = null, transformOrigin = null, width = null, zIndex = null } = {}) {
    this.height = height;
    this.left = left;
    this.maxHeight = maxHeight;
    this.maxWidth = maxWidth;
    this.minHeight = minHeight;
    this.minWidth = minWidth;
    this.rotateX = rotateX;
    this.rotateY = rotateY;
    this.rotateZ = rotateZ;
    this.scale = scale;
    this.top = top;
    this.transformOrigin = transformOrigin;
    this.translateX = translateX;
    this.translateY = translateY;
    this.translateZ = translateZ;
    this.width = width;
    this.zIndex = zIndex;
  }
};
var TJSPositionDataUtil = class {
  /**
   * Stores the TJSPositionData properties that can be animated.
   */
  static #animateKeys = Object.freeze(/* @__PURE__ */ new Set([
    // Main keys
    "left",
    "top",
    "maxWidth",
    "maxHeight",
    "minWidth",
    "minHeight",
    "width",
    "height",
    "rotateX",
    "rotateY",
    "rotateZ",
    "scale",
    "translateX",
    "translateY",
    "translateZ",
    "zIndex",
    // Aliases
    "rotation"
  ]));
  /**
   * Stores the TJSPositionData property aliases that can be animated.
   */
  static #animateKeyAliases = Object.freeze(/* @__PURE__ */ new Map([["rotation", "rotateZ"]]));
  /**
   * Provides numeric defaults for all parameters. This is used by {@link TJSPosition.get} to optionally provide
   * numeric defaults.
   */
  static #numericDefaults = Object.freeze({
    // Other keys
    height: 0,
    left: 0,
    maxHeight: null,
    maxWidth: null,
    minHeight: null,
    minWidth: null,
    top: 0,
    transformOrigin: null,
    width: 0,
    zIndex: null,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
    translateZ: 0
  });
  /**
   * Convenience to copy from source to target of two TJSPositionData like objects. If a target is not supplied a new
   * {@link TJSPositionData} instance is created.
   *
   * @param source - The source instance to copy from.
   *
   * @param [target] - Target TJSPositionData like object; if one is not provided a new instance is created.
   *
   * @returns The target instance with all TJSPositionData fields.
   */
  static copyData(source, target = new TJSPositionData()) {
    target.height = source.height ?? null;
    target.left = source.left ?? null;
    target.maxHeight = source.maxHeight ?? null;
    target.maxWidth = source.maxWidth ?? null;
    target.minHeight = source.minHeight ?? null;
    target.minWidth = source.minWidth ?? null;
    target.rotateX = source.rotateX ?? null;
    target.rotateY = source.rotateY ?? null;
    target.rotateZ = source.rotateZ ?? null;
    target.scale = source.scale ?? null;
    target.top = source.top ?? null;
    target.transformOrigin = source.transformOrigin ?? null;
    target.translateX = source.translateX ?? null;
    target.translateY = source.translateY ?? null;
    target.translateZ = source.translateZ ?? null;
    target.width = source.width ?? null;
    target.zIndex = source.zIndex ?? null;
    return target;
  }
  /**
   * Returns the non-aliased animation key.
   *
   * @param key - Animation key / possibly aliased key.
   *
   * @returns Actual non-aliased animation key.
   */
  static getAnimationKey(key) {
    return this.#animateKeyAliases.get(key) ?? key;
  }
  /**
   * Queries an object by the given key or otherwise returns any numeric default.
   *
   * @param data - An object to query for the given animation key.
   *
   * @param key - Animation key.
   *
   * @returns Data at key or numeric default.
   */
  static getDataOrDefault(data, key) {
    key = this.#animateKeyAliases.get(key) ?? key;
    return data[key] ?? this.#numericDefaults[key];
  }
  /**
   * Tests if the given key is an animation key.
   *
   * @param key - A potential animation key.
   *
   * @returns Is animation key.
   */
  static isAnimationKey(key) {
    return this.#animateKeys.has(key);
  }
  /**
   * Sets numeric defaults for a {@link TJSPositionData} like object.
   *
   * @param data - A TJSPositionData like object.
   */
  static setNumericDefaults(data) {
    if (data.rotateX === null) {
      data.rotateX = 0;
    }
    if (data.rotateY === null) {
      data.rotateY = 0;
    }
    if (data.rotateZ === null) {
      data.rotateZ = 0;
    }
    if (data.translateX === null) {
      data.translateX = 0;
    }
    if (data.translateY === null) {
      data.translateY = 0;
    }
    if (data.translateZ === null) {
      data.translateZ = 0;
    }
    if (data.scale === null) {
      data.scale = 1;
    }
  }
};
var ConvertStringData = class {
  /**
   * Animation keys for different processing categories.
   */
  static #animKeyTypes = {
    // Animation keys that can be specified in `px` converted to a number.
    numPx: Object.freeze(/* @__PURE__ */ new Set([
      "left",
      "top",
      "maxWidth",
      "maxHeight",
      "minWidth",
      "minHeight",
      "width",
      "height",
      "translateX",
      "translateY",
      "translateZ"
    ])),
    // Animation keys that can be specified in percentage of parent element constraint.
    percentParent: Object.freeze(/* @__PURE__ */ new Set([
      "left",
      "top",
      "maxWidth",
      "maxHeight",
      "minWidth",
      "minHeight",
      "width",
      "height"
    ])),
    // Only rotation animation keys can be specified in `rad` / `turn` converted to a number.
    rotationRadTurn: Object.freeze(/* @__PURE__ */ new Set(["rotateX", "rotateY", "rotateZ", "rotation"]))
  };
  /**
   * Parses string data values. Relative values must start with leading values '+=', '-=', or '*=' followed by a
   * float / numeric value. IE `+=45` or for percentage '+=10%'. Also handles exact percent value such as `10` or
   * `10%`. Percentage values are based on the current value, parent element constraints, or constraints of the type
   * of value like rotation being bound by 360 degrees.
   *
   * @privateRemarks
   * TODO: In the future support more specific CSS unit types.
   */
  static #regexStringData = /^(?<operation>[-+*]=)?(?<value>-?\d*\.?\d+)(?<unit>%|%~|px|rad|turn)?$/;
  /**
   * Stores the results for match groups from `regexStringData`;
   */
  static #matchResults = Object.seal({
    operation: void 0,
    value: 0,
    unit: void 0
  });
  /**
   * Converts any relative string values for animatable keys to actual updates performed against current data.
   *
   * @param data - position data.
   *
   * @param position - The source position data.
   *
   * @param el - Target positioned element.
   *
   * @returns Converted data.
   */
  static process(data, position, el) {
    let parentClientHeight = Number.NaN;
    let parentClientWidth = Number.NaN;
    for (const key in data) {
      if (TJSPositionDataUtil.isAnimationKey(key)) {
        const value = data[key];
        if (typeof value !== "string") {
          continue;
        }
        if (value === "auto" || value === "inherit") {
          continue;
        }
        const animKey = key;
        const regexResults = this.#regexStringData.exec(value);
        let handled = false;
        if (regexResults && regexResults.groups) {
          const results = this.#matchResults;
          results.operation = regexResults.groups.operation;
          results.value = parseFloat(regexResults.groups.value);
          results.unit = regexResults.groups.unit;
          const current = TJSPositionDataUtil.getDataOrDefault(position, key);
          switch (results.unit) {
            case "%": {
              if (this.#animKeyTypes.percentParent.has(key) && (Number.isNaN(parentClientHeight) || Number.isNaN(parentClientWidth))) {
                if (el?.parentElement?.isConnected) {
                  parentClientHeight = el.parentElement.clientHeight;
                  parentClientWidth = el.parentElement.clientWidth;
                } else {
                  parentClientHeight = 0;
                  parentClientWidth = 0;
                  console.warn(`TJSPosition - ConvertStringData warning: could not determine parent constraints for key '${key}' with value '${value}'.`);
                  data[key] = void 0;
                  continue;
                }
              }
              handled = this.#handlePercent(animKey, current, data, results, parentClientHeight, parentClientWidth);
              break;
            }
            case "%~":
              handled = this.#handleRelativePercent(animKey, current, data, results);
              break;
            case "px":
              handled = this.#animKeyTypes.numPx.has(key) ? this.#applyResultsValue(animKey, current, data, results) : false;
              break;
            case "rad":
            case "turn":
              handled = this.#animKeyTypes.rotationRadTurn.has(key) ? this.#handleRotationRadTurn(animKey, current, data, results) : false;
              break;
            default:
              handled = this.#applyResultsValue(animKey, current, data, results);
              break;
          }
        }
        if (!regexResults || !handled) {
          console.warn(`TJSPosition - ConvertStringData warning: malformed key '${key}' with value '${value}'.`);
          data[key] = void 0;
        }
      }
    }
    return data;
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Provides the common update to source data after `results.value` has been converted to the proper value
   * respectively.
   *
   * @param key - Animation key.
   *
   * @param current - Current value
   *
   * @param data - Source data to convert.
   *
   * @param results - Match results.
   *
   * @returns Adjustment successful.
   */
  static #applyResultsValue(key, current, data, results) {
    if (!results.operation) {
      data[key] = results.value;
      return true;
    }
    switch (results.operation) {
      case "-=":
        data[key] = current - results.value;
        break;
      case "+=":
        data[key] = current + results.value;
        break;
      case "*=":
        data[key] = current * results.value;
        break;
      default:
        return false;
    }
    return true;
  }
  /**
   * Handles the `%` unit type where values are adjusted against the parent element client width / height or in the
   * case of rotation the percentage of 360 degrees.
   *
   * @param key - Animation key.
   *
   * @param current - Current value
   *
   * @param data - Source data to convert.
   *
   * @param results - Match results.
   *
   * @param parentClientHeight - Parent element client height.
   *
   * @param parentClientWidth - Parent element client width.
   *
   * @returns Adjustment successful.
   */
  static #handlePercent(key, current, data, results, parentClientHeight, parentClientWidth) {
    switch (key) {
      case "left":
      case "maxWidth":
      case "minWidth":
      case "width":
      case "translateX":
        results.value = parentClientWidth * (results.value / 100);
        break;
      case "top":
      case "maxHeight":
      case "minHeight":
      case "height":
      case "translateY":
        results.value = parentClientHeight * (results.value / 100);
        break;
      case "rotateX":
      case "rotateY":
      case "rotateZ":
      case "rotation":
        results.value = 360 * (results.value / 100);
        break;
      default:
        return false;
    }
    return this.#applyResultsValue(key, current, data, results);
  }
  /**
   * Handles the `%~` unit type where values are adjusted against the current value for the given key.
   *
   * @param key - Animation key.
   *
   * @param current - Current value
   *
   * @param data - Source data to convert.
   *
   * @param results - Match results.
   *
   * @returns Adjustment successful.
   */
  static #handleRelativePercent(key, current, data, results) {
    results.value = results.value / 100;
    if (!results.operation) {
      data[key] = current * results.value;
      return true;
    }
    switch (results.operation) {
      case "-=":
        data[key] = current - current * results.value;
        break;
      case "+=":
        data[key] = current + current * results.value;
        break;
      case "*=":
        data[key] = current * (current * results.value);
        break;
      default:
        return false;
    }
    return true;
  }
  /**
   * Handles the `rad` / `turn` unit types for rotation animation keys.
   *
   * @param key - Animation key.
   *
   * @param current - Current value
   *
   * @param data - Source data to convert.
   *
   * @param results - Match results.
   *
   * @returns Adjustment successful.
   */
  static #handleRotationRadTurn(key, current, data, results) {
    switch (results.unit) {
      case "rad":
        results.value = radToDeg(results.value);
        break;
      case "turn":
        results.value = 360 * results.value;
        break;
    }
    return this.#applyResultsValue(key, current, data, results);
  }
};
var TJSTransformData = class {
  constructor() {
    Object.seal(this);
  }
  /**
   * Stores the calculated bounding rectangle.
   */
  #boundingRect = new DOMRect();
  /**
   * Stores the individual transformed corner points of the window in screen space clockwise from:
   * top left -> top right -> bottom right -> bottom left.
   */
  #corners = [new Vec3(), new Vec3(), new Vec3(), new Vec3()];
  /**
   * Stores the current gl-matrix Mat4 data.
   */
  #mat4 = new Mat4();
  /**
   * Stores the pre-origin & post-origin translations to apply to matrix transforms.
   */
  #originTranslations = [new Mat4(), new Mat4()];
  /**
   * @returns The bounding rectangle.
   */
  get boundingRect() {
    return this.#boundingRect;
  }
  /**
   * @returns The transformed corner points as Vec3 in screen space.
   */
  get corners() {
    return this.#corners;
  }
  /**
   * @returns Returns the CSS style string for the transform matrix.
   */
  get css() {
    return `matrix3d(${this.mat4.join(",")})`;
  }
  /**
   * @returns The transform matrix.
   */
  get mat4() {
    return this.#mat4;
  }
  /**
   * @returns The pre / post translation matrices for origin translation.
   */
  get originTranslations() {
    return this.#originTranslations;
  }
};
var NumberGuard = class {
  constructor() {
  }
  static isFinite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }
  static isFiniteOrNull(value) {
    return value === null || typeof value === "number" && Number.isFinite(value);
  }
};
var TJSPositionStyleCache = class {
  el;
  computed;
  marginLeft;
  marginTop;
  maxHeight;
  maxWidth;
  minHeight;
  minWidth;
  hasWillChange;
  stores;
  resizeObserved;
  constructor() {
    this.el = void 0;
    this.computed = void 0;
    this.marginLeft = void 0;
    this.marginTop = void 0;
    this.maxHeight = void 0;
    this.maxWidth = void 0;
    this.minHeight = void 0;
    this.minWidth = void 0;
    this.hasWillChange = false;
    this.resizeObserved = Object.seal({
      contentHeight: void 0,
      contentWidth: void 0,
      offsetHeight: void 0,
      offsetWidth: void 0
    });
    const storeResizeObserved = writable(this.resizeObserved);
    this.stores = {
      element: writable(this.el),
      resizeContentHeight: propertyStore(storeResizeObserved, "contentHeight"),
      resizeContentWidth: propertyStore(storeResizeObserved, "contentWidth"),
      resizeObserved: storeResizeObserved,
      resizeObservable: writable(false),
      resizeOffsetHeight: propertyStore(storeResizeObserved, "offsetHeight"),
      resizeOffsetWidth: propertyStore(storeResizeObserved, "offsetWidth")
    };
  }
  /**
   * Returns the cached offsetHeight from any attached `resizeObserver` action otherwise gets the offsetHeight from
   * the element directly. The more optimized path is using `resizeObserver` as getting it from the element
   * directly is more expensive and alters the execution order of an animation frame.
   *
   * @returns The element offsetHeight.
   */
  get offsetHeight() {
    if (this.el !== void 0 && A11yHelper.isFocusTarget(this.el)) {
      return this.resizeObserved.offsetHeight !== void 0 ? this.resizeObserved.offsetHeight : this.el.offsetHeight;
    }
    throw new Error(`TJSPositionStyleCache - get offsetHeight error: no element assigned.`);
  }
  /**
   * Returns the cached offsetWidth from any attached `resizeObserver` action otherwise gets the offsetWidth from
   * the element directly. The more optimized path is using `resizeObserver` as getting it from the element
   * directly is more expensive and alters the execution order of an animation frame.
   *
   * @returns The element offsetHeight.
   */
  get offsetWidth() {
    if (this.el !== void 0 && A11yHelper.isFocusTarget(this.el)) {
      return this.resizeObserved.offsetWidth !== void 0 ? this.resizeObserved.offsetWidth : this.el.offsetWidth;
    }
    throw new Error(`TJSPositionStyleCache - get offsetWidth error: no element assigned.`);
  }
  /**
   * @param el -
   *
   * @returns Does element match cached element.
   */
  hasData(el) {
    return this.el === el;
  }
  /**
   * Resets the style cache.
   */
  reset() {
    if (this.el !== void 0 && A11yHelper.isFocusTarget(this.el) && this.el.isConnected && !this.hasWillChange) {
      this.el.style.willChange = "";
    }
    this.el = void 0;
    this.computed = void 0;
    this.marginLeft = void 0;
    this.marginTop = void 0;
    this.maxHeight = void 0;
    this.maxWidth = void 0;
    this.minHeight = void 0;
    this.minWidth = void 0;
    this.hasWillChange = false;
    this.resizeObserved.contentHeight = void 0;
    this.resizeObserved.contentWidth = void 0;
    this.resizeObserved.offsetHeight = void 0;
    this.resizeObserved.offsetWidth = void 0;
    this.stores.element.set(void 0);
  }
  /**
   * Updates the style cache with new data from the given element.
   *
   * @param el - An HTML element.
   */
  update(el) {
    this.el = el;
    this.computed = globalThis.getComputedStyle(el);
    this.marginLeft = StyleParse.pixels(el.style.marginLeft) ?? StyleParse.pixels(this.computed.marginLeft);
    this.marginTop = StyleParse.pixels(el.style.marginTop) ?? StyleParse.pixels(this.computed.marginTop);
    this.maxHeight = StyleParse.pixels(el.style.maxHeight) ?? StyleParse.pixels(this.computed.maxHeight);
    this.maxWidth = StyleParse.pixels(el.style.maxWidth) ?? StyleParse.pixels(this.computed.maxWidth);
    this.minHeight = StyleParse.pixels(el.style.minHeight) ?? StyleParse.pixels(this.computed.minHeight);
    this.minWidth = StyleParse.pixels(el.style.minWidth) ?? StyleParse.pixels(this.computed.minWidth);
    const willChange = el.style.willChange !== "" ? el.style.willChange : this.computed.willChange ?? "";
    this.hasWillChange = willChange !== "" && willChange !== "auto";
    this.stores.element.set(el);
  }
};
var TJSTransforms = class _TJSTransforms {
  /**
   * Stores transform data.
   */
  #data = {};
  /**
   * Stores the transform keys in the order added.
   */
  #orderList = [];
  /**
   * Defines the keys of TJSPositionData that are transform keys.
   */
  static #transformKeys = Object.freeze([
    "rotateX",
    "rotateY",
    "rotateZ",
    "scale",
    "translateX",
    "translateY",
    "translateZ"
  ]);
  /**
   * Validates that a given key is a transform key.
   *
   * @param key - A potential transform key.
   */
  static #isTransformKey(key) {
    return this.#transformKeys.includes(key);
  }
  /**
   * Defines bitwise keys for transforms used in {@link TJSTransforms.getMat4}.
   */
  static #transformKeysBitwise = Object.freeze({
    rotateX: 1,
    rotateY: 2,
    rotateZ: 4,
    scale: 8,
    translateX: 16,
    translateY: 32,
    translateZ: 64
  });
  /**
   * Defines the default transform origin.
   */
  static #transformOriginDefault = "top left";
  /**
   * Defines the valid transform origins.
   */
  static #transformOrigins = Object.freeze([
    "top left",
    "top center",
    "top right",
    "center left",
    "center",
    "center right",
    "bottom left",
    "bottom center",
    "bottom right"
  ]);
  /**
   * Defines a valid Set of transform origins.
   */
  static #transformOriginsSet = Object.freeze(new Set(this.#transformOrigins));
  // Temporary variables --------------------------------------------------------------------------------------------
  /**
   */
  static #mat4Result = new Mat4();
  /**
   */
  static #mat4Temp = new Mat4();
  /**
   */
  static #vec3Temp = new Vec3();
  /**
   */
  static #vectorScale = [1, 1, 1];
  /**
   */
  static #vectorTranslate = [0, 0, 0];
  /**
   * Returns a list of supported transform origins.
   *
   * @returns The supported transform origin strings.
   */
  static get transformOrigins() {
    return this.#transformOrigins;
  }
  /**
   * Returns whether the given string is a {@link TransformAPI.TransformOrigin}.
   *
   * @param origin - A potential transform origin string.
   *
   * @returns True if origin is a TransformOrigin string.
   */
  static isTransformOrigin(origin) {
    return this.#transformOriginsSet.has(origin);
  }
  /**
   * @returns Whether there are active transforms in local data.
   */
  get isActive() {
    return this.#orderList.length > 0;
  }
  /**
   * @returns Any local rotateX data.
   */
  get rotateX() {
    return this.#data.rotateX;
  }
  /**
   * @returns Any local rotateY data.
   */
  get rotateY() {
    return this.#data.rotateY;
  }
  /**
   * @returns Any local rotateZ data.
   */
  get rotateZ() {
    return this.#data.rotateZ;
  }
  /**
   * @returns Any local rotateZ scale.
   */
  get scale() {
    return this.#data.scale;
  }
  /**
   * @returns Any local translateZ data.
   */
  get translateX() {
    return this.#data.translateX;
  }
  /**
   * @returns Any local translateZ data.
   */
  get translateY() {
    return this.#data.translateY;
  }
  /**
   * @returns Any local translateZ data.
   */
  get translateZ() {
    return this.#data.translateZ;
  }
  /**
   * Sets the local rotateX data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set rotateX(value) {
    if (Number.isFinite(value)) {
      if (this.#data.rotateX === void 0) {
        this.#orderList.push("rotateX");
      }
      this.#data.rotateX = value;
    } else {
      if (this.#data.rotateX !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "rotateX");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.rotateX;
    }
  }
  /**
   * Sets the local rotateY data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set rotateY(value) {
    if (Number.isFinite(value)) {
      if (this.#data.rotateY === void 0) {
        this.#orderList.push("rotateY");
      }
      this.#data.rotateY = value;
    } else {
      if (this.#data.rotateY !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "rotateY");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.rotateY;
    }
  }
  /**
   * Sets the local rotateZ data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set rotateZ(value) {
    if (Number.isFinite(value)) {
      if (this.#data.rotateZ === void 0) {
        this.#orderList.push("rotateZ");
      }
      this.#data.rotateZ = value;
    } else {
      if (this.#data.rotateZ !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "rotateZ");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.rotateZ;
    }
  }
  /**
   * Sets the local scale data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set scale(value) {
    if (Number.isFinite(value)) {
      if (this.#data.scale === void 0) {
        this.#orderList.push("scale");
      }
      this.#data.scale = value;
    } else {
      if (this.#data.scale !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "scale");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.scale;
    }
  }
  /**
   * Sets the local translateX data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set translateX(value) {
    if (Number.isFinite(value)) {
      if (this.#data.translateX === void 0) {
        this.#orderList.push("translateX");
      }
      this.#data.translateX = value;
    } else {
      if (this.#data.translateX !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "translateX");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.translateX;
    }
  }
  /**
   * Sets the local translateY data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set translateY(value) {
    if (Number.isFinite(value)) {
      if (this.#data.translateY === void 0) {
        this.#orderList.push("translateY");
      }
      this.#data.translateY = value;
    } else {
      if (this.#data.translateY !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "translateY");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.translateY;
    }
  }
  /**
   * Sets the local translateZ data if the value is a finite number otherwise removes the local data.
   *
   * @param value - A value to set.
   */
  set translateZ(value) {
    if (Number.isFinite(value)) {
      if (this.#data.translateZ === void 0) {
        this.#orderList.push("translateZ");
      }
      this.#data.translateZ = value;
    } else {
      if (this.#data.translateZ !== void 0) {
        const index = this.#orderList.findIndex((entry) => entry === "translateZ");
        if (index >= 0) {
          this.#orderList.splice(index, 1);
        }
      }
      delete this.#data.translateZ;
    }
  }
  /**
   * Returns the `matrix3d` CSS transform for the given position / transform data.
   *
   * @param [data] - Optional position data otherwise use local stored transform data.
   *
   * @returns The CSS `matrix3d` string.
   */
  getCSS(data = this.#data) {
    return `matrix3d(${this.getMat4(data, _TJSTransforms.#mat4Result).join(",")})`;
  }
  /**
   * Returns the `matrix3d` CSS transform for the given position / transform data.
   *
   * @param [data] - Optional position data otherwise use local stored transform data.
   *
   * @returns The CSS `matrix3d` string.
   */
  getCSSOrtho(data = this.#data) {
    return `matrix3d(${this.getMat4Ortho(data, _TJSTransforms.#mat4Result).join(",")})`;
  }
  /**
   * Collects all data including a bounding rect, transform matrix, and points array of the given
   * {@link TJSPositionData} instance with the applied local transform data.
   *
   * @param position - The position data to process.
   *
   * @param [output] - Optional TJSTransformData output instance.
   *
   * @param [validationData] - Optional validation data for adjustment parameters.
   *
   * @returns The output TJSTransformData instance.
   */
  getData(position, output = new TJSTransformData(), validationData) {
    const valWidth = validationData?.width ?? 0;
    const valHeight = validationData?.height ?? 0;
    const valOffsetTop = validationData?.offsetTop ?? validationData?.marginTop ?? 0;
    const valOffsetLeft = validationData?.offsetLeft ?? validationData?.marginLeft ?? 0;
    position.top += valOffsetTop;
    position.left += valOffsetLeft;
    const width = NumberGuard.isFinite(position.width) ? position.width : valWidth;
    const height = NumberGuard.isFinite(position.height) ? position.height : valHeight;
    const rect = output.corners;
    if (this.hasTransform(position)) {
      rect[0][0] = rect[0][1] = rect[0][2] = 0;
      rect[1][0] = width;
      rect[1][1] = rect[1][2] = 0;
      rect[2][0] = width;
      rect[2][1] = height;
      rect[2][2] = 0;
      rect[3][0] = 0;
      rect[3][1] = height;
      rect[3][2] = 0;
      const matrix = this.getMat4(position, output.mat4);
      const translate = _TJSTransforms.#getOriginTranslation(position.transformOrigin, width, height, output.originTranslations);
      if (_TJSTransforms.#transformOriginDefault === position.transformOrigin) {
        Vec3.transformMat4(rect[0], rect[0], matrix);
        Vec3.transformMat4(rect[1], rect[1], matrix);
        Vec3.transformMat4(rect[2], rect[2], matrix);
        Vec3.transformMat4(rect[3], rect[3], matrix);
      } else {
        Vec3.transformMat4(rect[0], rect[0], translate[0]);
        Vec3.transformMat4(rect[0], rect[0], matrix);
        Vec3.transformMat4(rect[0], rect[0], translate[1]);
        Vec3.transformMat4(rect[1], rect[1], translate[0]);
        Vec3.transformMat4(rect[1], rect[1], matrix);
        Vec3.transformMat4(rect[1], rect[1], translate[1]);
        Vec3.transformMat4(rect[2], rect[2], translate[0]);
        Vec3.transformMat4(rect[2], rect[2], matrix);
        Vec3.transformMat4(rect[2], rect[2], translate[1]);
        Vec3.transformMat4(rect[3], rect[3], translate[0]);
        Vec3.transformMat4(rect[3], rect[3], matrix);
        Vec3.transformMat4(rect[3], rect[3], translate[1]);
      }
      rect[0][0] = position.left + rect[0][0];
      rect[0][1] = position.top + rect[0][1];
      rect[1][0] = position.left + rect[1][0];
      rect[1][1] = position.top + rect[1][1];
      rect[2][0] = position.left + rect[2][0];
      rect[2][1] = position.top + rect[2][1];
      rect[3][0] = position.left + rect[3][0];
      rect[3][1] = position.top + rect[3][1];
    } else {
      rect[0][0] = position.left;
      rect[0][1] = position.top;
      rect[1][0] = position.left + width;
      rect[1][1] = position.top;
      rect[2][0] = position.left + width;
      rect[2][1] = position.top + height;
      rect[3][0] = position.left;
      rect[3][1] = position.top + height;
      Mat4.identity(output.mat4);
    }
    let maxX = Number.MIN_SAFE_INTEGER;
    let maxY = Number.MIN_SAFE_INTEGER;
    let minX = Number.MAX_SAFE_INTEGER;
    let minY = Number.MAX_SAFE_INTEGER;
    for (let cntr = 4; --cntr >= 0; ) {
      if (rect[cntr][0] > maxX) {
        maxX = rect[cntr][0];
      }
      if (rect[cntr][0] < minX) {
        minX = rect[cntr][0];
      }
      if (rect[cntr][1] > maxY) {
        maxY = rect[cntr][1];
      }
      if (rect[cntr][1] < minY) {
        minY = rect[cntr][1];
      }
    }
    const boundingRect = output.boundingRect;
    boundingRect.x = minX;
    boundingRect.y = minY;
    boundingRect.width = maxX - minX;
    boundingRect.height = maxY - minY;
    position.top -= valOffsetTop;
    position.left -= valOffsetLeft;
    return output;
  }
  /**
   * Creates a transform matrix based on local data applied in order it was added.
   *
   * If no data object is provided then the source is the local transform data. If another data object is supplied
   * then the stored local transform order is applied then all remaining transform keys are applied. This allows the
   * construction of a transform matrix in advance of setting local data and is useful in collision detection.
   *
   * @param [data] - TJSPositionData instance or local transform data.
   *
   * @param [output] - The output mat4 instance.
   *
   * @returns Transform matrix.
   */
  getMat4(data = this.#data, output = new Mat4()) {
    const matrix = Mat4.identity(output);
    let seenKeys = 0;
    const orderList = this.#orderList;
    for (let cntr = 0; cntr < orderList.length; cntr++) {
      const key = orderList[cntr];
      switch (key) {
        case "rotateX":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.rotateX;
          Mat4.multiply(matrix, matrix, Mat4.fromXRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
          break;
        case "rotateY":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.rotateY;
          Mat4.multiply(matrix, matrix, Mat4.fromYRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
          break;
        case "rotateZ":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.rotateZ;
          Mat4.multiply(matrix, matrix, Mat4.fromZRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
          break;
        case "scale":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.scale;
          _TJSTransforms.#vectorScale[0] = _TJSTransforms.#vectorScale[1] = data[key] ?? 0;
          Mat4.multiply(matrix, matrix, Mat4.fromScaling(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorScale));
          break;
        case "translateX":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.translateX;
          _TJSTransforms.#vectorTranslate[0] = data.translateX ?? 0;
          _TJSTransforms.#vectorTranslate[1] = 0;
          _TJSTransforms.#vectorTranslate[2] = 0;
          Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
          break;
        case "translateY":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.translateY;
          _TJSTransforms.#vectorTranslate[0] = 0;
          _TJSTransforms.#vectorTranslate[1] = data.translateY ?? 0;
          _TJSTransforms.#vectorTranslate[2] = 0;
          Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
          break;
        case "translateZ":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.translateZ;
          _TJSTransforms.#vectorTranslate[0] = 0;
          _TJSTransforms.#vectorTranslate[1] = 0;
          _TJSTransforms.#vectorTranslate[2] = data.translateZ ?? 0;
          Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
          break;
      }
    }
    if (data !== this.#data) {
      for (let cntr = 0; cntr < _TJSTransforms.#transformKeys.length; cntr++) {
        const key = _TJSTransforms.#transformKeys[cntr];
        if (data[key] === null || (seenKeys & _TJSTransforms.#transformKeysBitwise[key]) > 0) {
          continue;
        }
        const value = data[key];
        switch (key) {
          case "rotateX":
            Mat4.multiply(matrix, matrix, Mat4.fromXRotation(_TJSTransforms.#mat4Temp, degToRad(value)));
            break;
          case "rotateY":
            Mat4.multiply(matrix, matrix, Mat4.fromYRotation(_TJSTransforms.#mat4Temp, degToRad(value)));
            break;
          case "rotateZ":
            Mat4.multiply(matrix, matrix, Mat4.fromZRotation(_TJSTransforms.#mat4Temp, degToRad(value)));
            break;
          case "scale":
            _TJSTransforms.#vectorScale[0] = _TJSTransforms.#vectorScale[1] = value;
            Mat4.multiply(matrix, matrix, Mat4.fromScaling(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorScale));
            break;
          case "translateX":
            _TJSTransforms.#vectorTranslate[0] = value;
            _TJSTransforms.#vectorTranslate[1] = 0;
            _TJSTransforms.#vectorTranslate[2] = 0;
            Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
            break;
          case "translateY":
            _TJSTransforms.#vectorTranslate[0] = 0;
            _TJSTransforms.#vectorTranslate[1] = value;
            _TJSTransforms.#vectorTranslate[2] = 0;
            Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
            break;
          case "translateZ":
            _TJSTransforms.#vectorTranslate[0] = 0;
            _TJSTransforms.#vectorTranslate[1] = 0;
            _TJSTransforms.#vectorTranslate[2] = value;
            Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
            break;
        }
      }
    }
    return matrix;
  }
  /**
   * Provides an orthographic enhancement to convert left / top positional data to a translate operation.
   *
   * This transform matrix takes into account that the remaining operations are , but adds any left / top attributes
   * from passed in data to translate X / Y.
   *
   * If no data object is provided then the source is the local transform data. If another data object is supplied
   * then the stored local transform order is applied then all remaining transform keys are applied. This allows the
   * construction of a transform matrix in advance of setting local data and is useful in collision detection.
   *
   * @param [data] - TJSPositionData instance or local transform data.
   *
   * @param [output] - The output mat4 instance.
   *
   * @returns Transform matrix.
   */
  getMat4Ortho(data = this.#data, output = new Mat4()) {
    const matrix = Mat4.identity(output);
    _TJSTransforms.#vectorTranslate[0] = (data.left ?? 0) + (data.translateX ?? 0);
    _TJSTransforms.#vectorTranslate[1] = (data.top ?? 0) + (data.translateY ?? 0);
    _TJSTransforms.#vectorTranslate[2] = data.translateZ ?? 0;
    Mat4.multiply(matrix, matrix, Mat4.fromTranslation(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorTranslate));
    if (data.scale !== null && data.scale !== void 0) {
      _TJSTransforms.#vectorScale[0] = _TJSTransforms.#vectorScale[1] = data.scale;
      Mat4.multiply(matrix, matrix, Mat4.fromScaling(_TJSTransforms.#mat4Temp, _TJSTransforms.#vectorScale));
    }
    if (data.rotateX === null && data.rotateY === null && data.rotateZ === null) {
      return matrix;
    }
    let seenKeys = 0;
    const orderList = this.#orderList;
    for (let cntr = 0; cntr < orderList.length; cntr++) {
      const key = orderList[cntr];
      switch (key) {
        case "rotateX":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.rotateX;
          Mat4.multiply(matrix, matrix, Mat4.fromXRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
          break;
        case "rotateY":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.rotateY;
          Mat4.multiply(matrix, matrix, Mat4.fromYRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
          break;
        case "rotateZ":
          seenKeys |= _TJSTransforms.#transformKeysBitwise.rotateZ;
          Mat4.multiply(matrix, matrix, Mat4.fromZRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
          break;
      }
    }
    if (data !== this.#data) {
      for (let cntr = 0; cntr < _TJSTransforms.#transformKeys.length; cntr++) {
        const key = _TJSTransforms.#transformKeys[cntr];
        if (data[key] === null || (seenKeys & _TJSTransforms.#transformKeysBitwise[key]) > 0) {
          continue;
        }
        switch (key) {
          case "rotateX":
            Mat4.multiply(matrix, matrix, Mat4.fromXRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
            break;
          case "rotateY":
            Mat4.multiply(matrix, matrix, Mat4.fromYRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
            break;
          case "rotateZ":
            Mat4.multiply(matrix, matrix, Mat4.fromZRotation(_TJSTransforms.#mat4Temp, degToRad(data[key] ?? 0)));
            break;
        }
      }
    }
    return matrix;
  }
  /**
   * Tests an object if it contains transform keys and the values are finite numbers.
   *
   * @param data - An object to test for transform data.
   *
   * @returns Whether the given TJSPositionData has transforms.
   */
  hasTransform(data) {
    for (const key of _TJSTransforms.#transformKeys) {
      if (Number.isFinite(data[key])) {
        return true;
      }
    }
    return false;
  }
  /**
   * Resets internal data from the given object containing valid transform keys.
   *
   * @param data - An object with transform data.
   */
  reset(data) {
    for (const key in data) {
      if (_TJSTransforms.#isTransformKey(key)) {
        const value = data[key];
        if (NumberGuard.isFinite(value)) {
          this.#data[key] = value;
        } else {
          const index = this.#orderList.findIndex((entry) => entry === key);
          if (index >= 0) {
            this.#orderList.splice(index, 1);
          }
          delete this.#data[key];
        }
      }
    }
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Returns the translations necessary to translate a matrix operation based on the `transformOrigin` parameter of the
   * given position instance. The first entry / index 0 is the pre-translation and last entry / index 1 is the post-
   * translation.
   *
   * This method is used internally, but may be useful if you need the origin translation matrices to transform
   * bespoke points based on any `transformOrigin` set in {@link TJSPositionData}.
   *
   * @param transformOrigin - The transform origin attribute from TJSPositionData.
   *
   * @param width - The TJSPositionData width or validation data width when 'auto'.
   *
   * @param height - The TJSPositionData height or validation data height when 'auto'.
   *
   * @param output - Output Mat4 array.
   *
   * @returns Output Mat4 array.
   */
  static #getOriginTranslation(transformOrigin, width, height, output) {
    const vector = _TJSTransforms.#vec3Temp;
    switch (transformOrigin) {
      case "top left":
        vector[0] = vector[1] = 0;
        Mat4.fromTranslation(output[0], vector);
        Mat4.fromTranslation(output[1], vector);
        break;
      case "top center":
        vector[0] = -width * 0.5;
        vector[1] = 0;
        Mat4.fromTranslation(output[0], vector);
        vector[0] = width * 0.5;
        Mat4.fromTranslation(output[1], vector);
        break;
      case "top right":
        vector[0] = -width;
        vector[1] = 0;
        Mat4.fromTranslation(output[0], vector);
        vector[0] = width;
        Mat4.fromTranslation(output[1], vector);
        break;
      case "center left":
        vector[0] = 0;
        vector[1] = -height * 0.5;
        Mat4.fromTranslation(output[0], vector);
        vector[1] = height * 0.5;
        Mat4.fromTranslation(output[1], vector);
        break;
      case null:
      case "center":
        vector[0] = -width * 0.5;
        vector[1] = -height * 0.5;
        Mat4.fromTranslation(output[0], vector);
        vector[0] = width * 0.5;
        vector[1] = height * 0.5;
        Mat4.fromTranslation(output[1], vector);
        break;
      case "center right":
        vector[0] = -width;
        vector[1] = -height * 0.5;
        Mat4.fromTranslation(output[0], vector);
        vector[0] = width;
        vector[1] = height * 0.5;
        Mat4.fromTranslation(output[1], vector);
        break;
      case "bottom left":
        vector[0] = 0;
        vector[1] = -height;
        Mat4.fromTranslation(output[0], vector);
        vector[1] = height;
        Mat4.fromTranslation(output[1], vector);
        break;
      case "bottom center":
        vector[0] = -width * 0.5;
        vector[1] = -height;
        Mat4.fromTranslation(output[0], vector);
        vector[0] = width * 0.5;
        vector[1] = height;
        Mat4.fromTranslation(output[1], vector);
        break;
      case "bottom right":
        vector[0] = -width;
        vector[1] = -height;
        Mat4.fromTranslation(output[0], vector);
        vector[0] = width;
        vector[1] = height;
        Mat4.fromTranslation(output[1], vector);
        break;
      default:
        Mat4.identity(output[0]);
        Mat4.identity(output[1]);
        break;
    }
    return output;
  }
};
var AnimationScheduler = class {
  /**
   * Used to copy data from a TJSPosition instance.
   */
  static #data = {};
  static #getEaseOptions = Object.freeze({ default: false });
  /**
   * Adds / schedules an animation w/ the AnimationManager. This contains the final steps common to all tweens.
   *
   * @param position -
   *
   * @param initial -
   *
   * @param destination -
   *
   * @param duration -
   *
   * @param el -
   *
   * @param cancelable -
   *
   * @param delay -
   *
   * @param ease -
   *
   * @param [interpolate=lerp] -
   *
   * @param [transformOrigin] -
   *
   * @param [transformOriginInitial] -
   *
   * @param [cleanup] -
   *
   * @returns An AnimationControl instance or null if none created.
   */
  static #addAnimation(position, initial, destination, duration, el, cancelable, delay, ease, interpolate = lerp, transformOrigin, transformOriginInitial, cleanup) {
    TJSPositionDataUtil.setNumericDefaults(initial);
    TJSPositionDataUtil.setNumericDefaults(destination);
    for (const key in initial) {
      if (!Number.isFinite(initial[key])) {
        delete initial[key];
      }
    }
    const keys = Object.keys(initial);
    const newData = Object.assign({}, initial);
    if (keys.length === 0) {
      return null;
    }
    const animationData = {
      active: true,
      cleanup,
      cancelable,
      cancelled: false,
      control: void 0,
      current: 0,
      destination,
      duration: duration * 1e3,
      // Internally the AnimationManager works in ms.
      ease,
      el,
      finished: false,
      initial,
      interpolate,
      keys,
      newData,
      position,
      resolve: void 0,
      start: void 0,
      transformOrigin,
      transformOriginInitial,
      quickTo: false
    };
    if (delay > 0) {
      animationData.active = false;
      setTimeout(() => animationData.active = true, delay * 1e3);
    }
    AnimationManager.add(animationData);
    return new AnimationControl(animationData, true);
  }
  /**
   * Provides a tween from given position data to the current position.
   *
   * @param position - The target position instance.
   *
   * @param fromData - The starting position.
   *
   * @param options - Tween options.
   *
   * @param [cleanup] - Custom animation cleanup function.
   *
   * @returns An AnimationControl instance or null if none created.
   */
  static from(position, fromData, options = {}, cleanup) {
    if (!isObject(fromData)) {
      throw new TypeError(`AnimationAPI.from error: 'fromData' is not an object.`);
    }
    const parent = position.parent;
    if (parent !== void 0 && typeof parent?.options?.positionable === "boolean" && !parent?.options?.positionable) {
      return null;
    }
    let { cancelable = true, delay = 0, duration = 1, ease = "cubicOut", strategy, transformOrigin } = options;
    if (strategy !== void 0) {
      if (this.#handleStrategy(position, strategy) === null) {
        return null;
      }
    }
    const targetEl = A11yHelper.isFocusTarget(parent) ? parent : parent?.elementTarget;
    const el = A11yHelper.isFocusTarget(targetEl) && targetEl.isConnected ? targetEl : void 0;
    if (!Number.isFinite(delay) || delay < 0) {
      throw new TypeError(`AnimationScheduler.from error: 'delay' is not a positive number.`);
    }
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(`AnimationScheduler.from error: 'duration' is not a positive number.`);
    }
    ease = getEasingFunc(ease, this.#getEaseOptions);
    if (typeof ease !== "function") {
      throw new TypeError(`AnimationScheduler.from error: 'ease' is not a function or valid Svelte easing function name.`);
    }
    const initial = {};
    const destination = {};
    position.get(this.#data);
    transformOrigin = TJSTransforms.isTransformOrigin(transformOrigin) ? transformOrigin : void 0;
    const transformOriginInitial = transformOrigin !== void 0 ? this.#data.transformOrigin : void 0;
    for (const key in fromData) {
      const animKey = TJSPositionDataUtil.getAnimationKey(key);
      if (this.#data[animKey] !== void 0 && fromData[key] !== this.#data[animKey]) {
        initial[key] = fromData[key];
        destination[key] = this.#data[animKey];
      }
    }
    ConvertStringData.process(initial, this.#data, el);
    return this.#addAnimation(position, initial, destination, duration, el, cancelable, delay, ease, lerp, transformOrigin, transformOriginInitial, cleanup);
  }
  /**
   * Provides a tween from given position data to the given position.
   *
   * @param position - The target position instance.
   *
   * @param fromData - The starting position.
   *
   * @param toData - The ending position.
   *
   * @param options - Tween options.
   *
   * @param [cleanup] - Custom animation cleanup function.
   *
   * @returns An AnimationControl instance or null if none created.
   */
  static fromTo(position, fromData, toData, options = {}, cleanup) {
    if (!isObject(fromData)) {
      throw new TypeError(`AnimationScheduler.fromTo error: 'fromData' is not an object.`);
    }
    if (!isObject(toData)) {
      throw new TypeError(`AnimationScheduler.fromTo error: 'toData' is not an object.`);
    }
    const parent = position.parent;
    if (parent !== void 0 && typeof parent?.options?.positionable === "boolean" && !parent?.options?.positionable) {
      return null;
    }
    let { cancelable = true, delay = 0, duration = 1, ease = "cubicOut", strategy, transformOrigin } = options;
    if (strategy !== void 0) {
      if (this.#handleStrategy(position, strategy) === null) {
        return null;
      }
    }
    const targetEl = A11yHelper.isFocusTarget(parent) ? parent : parent?.elementTarget;
    const el = A11yHelper.isFocusTarget(targetEl) && targetEl.isConnected ? targetEl : void 0;
    if (!Number.isFinite(delay) || delay < 0) {
      throw new TypeError(`AnimationScheduler.fromTo error: 'delay' is not a positive number.`);
    }
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(`AnimationScheduler.fromTo error: 'duration' is not a positive number.`);
    }
    ease = getEasingFunc(ease, this.#getEaseOptions);
    if (typeof ease !== "function") {
      throw new TypeError(`AnimationScheduler.fromTo error: 'ease' is not a function or valid Svelte easing function name.`);
    }
    const initial = {};
    const destination = {};
    position.get(this.#data);
    transformOrigin = TJSTransforms.isTransformOrigin(transformOrigin) ? transformOrigin : void 0;
    const transformOriginInitial = transformOrigin !== void 0 ? this.#data.transformOrigin : void 0;
    for (const key in fromData) {
      if (toData[key] === void 0) {
        console.warn(`AnimationScheduler.fromTo warning: skipping key ('${key}') from 'fromData' as it is missing in 'toData'.`);
        continue;
      }
      const animKey = TJSPositionDataUtil.getAnimationKey(key);
      if (this.#data[animKey] !== void 0) {
        initial[key] = fromData[key];
        destination[key] = toData[key];
      }
    }
    ConvertStringData.process(initial, this.#data, el);
    ConvertStringData.process(destination, this.#data, el);
    return this.#addAnimation(position, initial, destination, duration, el, cancelable, delay, ease, lerp, transformOrigin, transformOriginInitial, cleanup);
  }
  /**
   * Provides a tween to given position data from the current position.
   *
   * @param position - The target position instance.
   *
   * @param toData - The destination position.
   *
   * @param options - Tween options.
   *
   * @param [cleanup] - Custom animation cleanup function.
   *
   * @returns An AnimationControl instance or null if none created.
   */
  static to(position, toData, options, cleanup) {
    if (!isObject(toData)) {
      throw new TypeError(`AnimationScheduler.to error: 'toData' is not an object.`);
    }
    const parent = position.parent;
    if (parent !== void 0 && typeof parent?.options?.positionable === "boolean" && !parent?.options?.positionable) {
      return null;
    }
    let { cancelable = true, delay = 0, duration = 1, ease = "cubicOut", strategy, transformOrigin } = options;
    if (strategy !== void 0) {
      if (this.#handleStrategy(position, strategy) === null) {
        return null;
      }
    }
    const targetEl = A11yHelper.isFocusTarget(parent) ? parent : parent?.elementTarget;
    const el = A11yHelper.isFocusTarget(targetEl) && targetEl.isConnected ? targetEl : void 0;
    if (!Number.isFinite(delay) || delay < 0) {
      throw new TypeError(`AnimationScheduler.to error: 'delay' is not a positive number.`);
    }
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(`AnimationScheduler.to error: 'duration' is not a positive number.`);
    }
    ease = getEasingFunc(ease, this.#getEaseOptions);
    if (typeof ease !== "function") {
      throw new TypeError(`AnimationScheduler.to error: 'ease' is not a function or valid Svelte easing function name.`);
    }
    const initial = {};
    const destination = {};
    position.get(this.#data);
    transformOrigin = TJSTransforms.isTransformOrigin(transformOrigin) ? transformOrigin : void 0;
    const transformOriginInitial = transformOrigin !== void 0 ? this.#data.transformOrigin : void 0;
    for (const key in toData) {
      const animKey = TJSPositionDataUtil.getAnimationKey(key);
      if (this.#data[animKey] !== void 0 && toData[key] !== this.#data[animKey]) {
        destination[key] = toData[key];
        initial[key] = this.#data[animKey];
      }
    }
    ConvertStringData.process(destination, this.#data, el);
    return this.#addAnimation(position, initial, destination, duration, el, cancelable, delay, ease, lerp, transformOrigin, transformOriginInitial, cleanup);
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Handle any defined scheduling strategy allowing existing scheduled animations for the same position instance
   * to be controlled.
   *
   * @param position - The target position instance.
   *
   * @param strategy - A scheduling strategy to apply.
   *
   * @returns Returns null to abort scheduling current animation.
   */
  static #handleStrategy(position, strategy) {
    switch (strategy) {
      case "cancel":
        if (AnimationManager.isScheduled(position)) {
          AnimationManager.cancel(position);
        }
        break;
      case "cancelAll":
        if (AnimationManager.isScheduled(position)) {
          AnimationManager.cancel(position, AnimationManager.cancelAllFn);
        }
        break;
      case "exclusive":
        if (AnimationManager.isScheduled(position)) {
          return null;
        }
        break;
      default:
        console.warn(`AnimationScheduler error: 'strategy' is not 'cancel', 'cancelAll', or 'exclusive'.`);
        return null;
    }
  }
};
var AnimationAPIImpl = class _AnimationAPIImpl {
  static #getEaseOptions = Object.freeze({ default: false });
  /**
   */
  #data;
  #position;
  /**
   * @param position -
   *
   * @param data -
   */
  constructor(position, data) {
    this.#position = position;
    this.#data = data;
    Object.seal(this);
  }
  /**
   * Returns if there are scheduled animations whether active or pending for this TJSPosition instance.
   *
   * @returns Are there scheduled animations.
   */
  get isScheduled() {
    return AnimationManager.isScheduled(this.#position);
  }
  /**
   * Cancels all animation instances for this TJSPosition instance.
   */
  cancel() {
    AnimationManager.cancel(this.#position, AnimationManager.cancelAllFn);
  }
  /**
   * Returns all currently scheduled AnimationControl instances for this TJSPosition instance.
   *
   * @returns All currently scheduled animation controls for this TJSPosition instance.
   */
  getScheduled() {
    return AnimationManager.getScheduled(this.#position);
  }
  /**
   * Provides a tween from given position data to the current position.
   *
   * @param fromData - The starting position.
   *
   * @param [options] - Optional tween parameters.
   *
   * @returns A control object that can cancel animation and provides a `finished` Promise.
   */
  from(fromData, options) {
    const animationControl = AnimationScheduler.from(this.#position, fromData, options);
    return animationControl ? animationControl : AnimationControl.voidControl;
  }
  /**
   * Provides a tween from given position data to the given position.
   *
   * @param fromData - The starting position.
   *
   * @param toData - The ending position.
   *
   * @param [options] - Optional tween parameters.
   *
   * @returns A control object that can cancel animation and provides a `finished` Promise.
   */
  fromTo(fromData, toData, options) {
    const animationControl = AnimationScheduler.fromTo(this.#position, fromData, toData, options);
    return animationControl ? animationControl : AnimationControl.voidControl;
  }
  /**
   * Provides a tween to given position data from the current position.
   *
   * @param toData - The destination position.
   *
   * @param [options] - Optional tween parameters.
   *
   * @returns A control object that can cancel animation and provides a `finished` Promise.
   */
  to(toData, options) {
    const animationControl = AnimationScheduler.to(this.#position, toData, options);
    return animationControl ? animationControl : AnimationControl.voidControl;
  }
  /**
   * Returns a function that provides an optimized way to constantly update a to-tween.
   *
   * @param keys - The keys for quickTo.
   *
   * @param [options] - Optional quick tween parameters.
   *
   * @returns quick-to tween function.
   */
  quickTo(keys, options = {}) {
    if (!isIterable(keys)) {
      throw new TypeError(`AnimationAPI.quickTo error: 'keys' is not an iterable list.`);
    }
    const parent = this.#position.parent;
    if (parent !== void 0 && typeof parent?.options?.positionable === "boolean" && !parent?.options?.positionable) {
      throw new Error(`AnimationAPI.quickTo error: 'parent' is not positionable.`);
    }
    let { duration = 1, ease = "cubicOut" } = options;
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(`AnimationAPI.quickTo error: 'duration' is not a positive number.`);
    }
    ease = getEasingFunc(ease, _AnimationAPIImpl.#getEaseOptions);
    if (typeof ease !== "function") {
      throw new TypeError(`AnimationAPI.quickTo error: 'ease' is not a function or valid Svelte easing function name.`);
    }
    const initial = {};
    const destination = {};
    const data = this.#data;
    for (const key of keys) {
      if (typeof key !== "string") {
        throw new TypeError(`AnimationAPI.quickTo error: key ('${key}') is not a string.`);
      }
      if (!TJSPositionDataUtil.isAnimationKey(key)) {
        throw new Error(`AnimationAPI.quickTo error: key ('${key}') is not animatable.`);
      }
      const value = TJSPositionDataUtil.getDataOrDefault(data, key);
      if (value !== null) {
        destination[key] = value;
        initial[key] = value;
      }
    }
    const keysArray = [...keys];
    Object.freeze(keysArray);
    const newData = Object.assign({}, initial);
    const animationData = {
      active: true,
      cancelable: true,
      cancelled: false,
      control: void 0,
      current: 0,
      destination,
      duration: duration * 1e3,
      // Internally the AnimationManager works in ms.
      ease,
      el: void 0,
      finished: true,
      // Note: start in finished state to add to AnimationManager on first callback.
      initial,
      interpolate: lerp,
      keys: keysArray,
      newData,
      position: this.#position,
      resolve: void 0,
      start: 0,
      quickTo: true
    };
    const quickToCB = (...args) => {
      const argsLength = args.length;
      if (argsLength === 0) {
        return;
      }
      for (let cntr = keysArray.length; --cntr >= 0; ) {
        const key = keysArray[cntr];
        const animKey = TJSPositionDataUtil.getAnimationKey(key);
        if (data[animKey] !== void 0) {
          initial[key] = data[animKey];
        }
      }
      if (isObject(args[0])) {
        const objData = args[0];
        for (const key in objData) {
          if (destination[key] !== void 0) {
            destination[key] = objData[key];
          }
        }
      } else {
        for (let cntr = 0; cntr < argsLength && cntr < keysArray.length; cntr++) {
          const key = keysArray[cntr];
          if (destination[key] !== void 0) {
            destination[key] = args[cntr];
          }
        }
      }
      TJSPositionDataUtil.setNumericDefaults(initial);
      TJSPositionDataUtil.setNumericDefaults(destination);
      const targetEl = A11yHelper.isFocusTarget(parent) ? parent : parent?.elementTarget;
      animationData.el = A11yHelper.isFocusTarget(targetEl) && targetEl.isConnected ? targetEl : void 0;
      ConvertStringData.process(destination, data, animationData.el);
      if (animationData.finished) {
        animationData.cancelled = false;
        animationData.finished = false;
        animationData.active = true;
        animationData.current = 0;
        AnimationManager.add(animationData);
      } else {
        const now = globalThis.performance.now();
        animationData.cancelled = false;
        animationData.current = 0;
        animationData.start = now + (AnimationManager.timeNow - now);
      }
    };
    Object.defineProperty(quickToCB, "keys", {
      value: keysArray,
      writable: false,
      configurable: false
    });
    Object.defineProperty(quickToCB, "options", {
      value: (optionsCB) => {
        let { duration: duration2, ease: ease2 } = optionsCB;
        if (duration2 !== void 0 && (!Number.isFinite(duration2) || duration2 < 0)) {
          throw new TypeError(`AnimationAPI.quickTo.options error: 'duration' is not a positive number.`);
        }
        ease2 = getEasingFunc(ease2, _AnimationAPIImpl.#getEaseOptions);
        if (ease2 !== void 0 && typeof ease2 !== "function") {
          throw new TypeError(`AnimationAPI.quickTo.options error: 'ease' is not a function or valid Svelte easing function name.`);
        }
        if (NumberGuard.isFinite(duration2) && duration2 >= 0) {
          animationData.duration = duration2 * 1e3;
        }
        if (ease2) {
          animationData.ease = ease2;
        }
        return quickToCB;
      },
      writable: false,
      configurable: false
    });
    return quickToCB;
  }
};
var AnimationGroupControl = class _AnimationGroupControl {
  /**
   */
  #animationControls;
  /**
   */
  #finishedPromise;
  /**
   * Defines a static empty / void animation control.
   */
  static #voidControl = new _AnimationGroupControl(null);
  /**
   * Provides a static void / undefined AnimationGroupControl that is automatically resolved.
   */
  static get voidControl() {
    return this.#voidControl;
  }
  /**
   * @param animationControls - A Set of AnimationControl instances.
   */
  constructor(animationControls) {
    this.#animationControls = animationControls;
  }
  /**
   * Get a promise that resolves when all animations are finished.
   *
   * @returns Finished Promise for all animations.
   */
  get finished() {
    const animationControls = this.#animationControls;
    if (!CrossWindow.isPromise(this.#finishedPromise)) {
      if (animationControls === null || animationControls === void 0 || animationControls.size === 0) {
        this.#finishedPromise = Promise.resolve({ cancelled: false });
      } else {
        const promises = [];
        for (const animationControl of animationControls) {
          promises.push(animationControl.finished);
        }
        this.#finishedPromise = Promise.allSettled(promises).then((results) => {
          const anyCancelled = results.some((result) => result.status === "rejected" || result.status === "fulfilled" && result.value.cancelled);
          return { cancelled: anyCancelled };
        });
      }
    }
    return this.#finishedPromise;
  }
  /**
   * Returns whether there are active animation instances for this group.
   *
   * Note: a delayed animation may not be started / active yet. Use {@link AnimationGroupControl.isFinished} to
   * determine if all animations in the group are finished.
   *
   * @returns Are there active animation instances.
   */
  get isActive() {
    const animationControls = this.#animationControls;
    if (animationControls === null || animationControls === void 0 || animationControls.size === 0) {
      return false;
    }
    for (const animationControl of animationControls) {
      if (animationControl.isActive) {
        return true;
      }
    }
    return false;
  }
  /**
   * Returns whether all animations in the group are finished.
   *
   * @returns Are all animation instances finished.
   */
  get isFinished() {
    const animationControls = this.#animationControls;
    if (animationControls === null || animationControls === void 0 || animationControls.size === 0) {
      return true;
    }
    for (const animationControl of animationControls) {
      if (!animationControl.isFinished) {
        return false;
      }
    }
    return true;
  }
  /**
   * Cancels the all animations.
   */
  cancel() {
    const animationControls = this.#animationControls;
    if (animationControls === null || animationControls === void 0 || animationControls.size === 0) {
      return;
    }
    for (const animationControl of animationControls) {
      animationControl.cancel();
    }
  }
};
var AnimationGroupAPIImpl = class {
  constructor() {
  }
  /**
   * Returns the TJSPosition instance for the possible given positionable by checking the instance by checking for
   * AnimationAPI.
   *
   * @param positionable - Possible position group entry.
   *
   * @returns Returns actual TJSPosition instance.
   */
  static #getPosition(positionable) {
    if (!isObject(positionable)) {
      return null;
    }
    if (positionable.animate instanceof AnimationAPIImpl) {
      return positionable;
    }
    if (positionable.position?.animate instanceof AnimationAPIImpl) {
      return positionable.position;
    }
    return null;
  }
  /**
   * Cancels any animation for given TJSPosition.PositionGroup data.
   *
   * @param positionGroup - The position group to cancel.
   */
  static cancel(positionGroup) {
    if (isIterable(positionGroup)) {
      let index = -1;
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.cancel warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        AnimationManager.cancel(actualPosition);
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.cancel warning: No TJSPosition instance found.`);
        return;
      }
      AnimationManager.cancel(actualPosition);
    }
  }
  /**
   * Cancels all TJSPosition animation.
   */
  static cancelAll() {
    AnimationManager.cancelAll();
  }
  /**
   * Gets all animation controls for the given position group data.
   *
   * @param positionGroup - A position group.
   *
   * @returns Results array.
   */
  static getScheduled(positionGroup) {
    const results = [];
    if (isIterable(positionGroup)) {
      let index = -1;
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.getScheduled warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        const controls = AnimationManager.getScheduled(actualPosition);
        results.push({
          position: actualPosition,
          entry: actualPosition !== entry ? entry : void 0,
          controls
        });
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.getScheduled warning: No TJSPosition instance found.`);
        return results;
      }
      const controls = AnimationManager.getScheduled(actualPosition);
      results.push({
        position: actualPosition,
        entry: actualPosition !== positionGroup ? positionGroup : void 0,
        controls
      });
    }
    return results;
  }
  /**
   * Provides a type guard to test in the given key is an {@link AnimationAPIImpl.AnimationKey}.
   *
   * @param key - A key value to test.
   *
   * @returns Whether the given key is an animation key.
   */
  static isAnimationKey(key) {
    return TJSPositionDataUtil.isAnimationKey(key);
  }
  /**
   * Returns the status _for the entire position group_ specified if all position instances of the group are scheduled.
   *
   * @param positionGroup - A position group.
   *
   * @param [options] - Options.
   *
   * @returns True if all are scheduled / false if just one position instance in the group is not scheduled.
   */
  static isScheduled(positionGroup, options) {
    if (isIterable(positionGroup)) {
      let index = -1;
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.isScheduled warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        if (!AnimationManager.isScheduled(actualPosition, options)) {
          return false;
        }
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.isScheduled warning: No TJSPosition instance found.`);
        return false;
      }
      if (!AnimationManager.isScheduled(actualPosition, options)) {
        return false;
      }
    }
    return true;
  }
  /**
   * Provides the `from` animation tween for one or more positionable instances as a group.
   *
   * @param positionGroup - A position group.
   *
   * @param fromData - A position data object assigned to all positionable instances or a callback function invoked for
   *        unique data for each instance.
   *
   * @param [options] - Tween options assigned to all positionable instances or a callback function invoked for unique
   *        options for each instance.
   *
   * @returns Basic animation control.
   */
  static from(positionGroup, fromData, options) {
    if (!isObject(fromData) && typeof fromData !== "function") {
      throw new TypeError(`AnimationGroupAPI.from error: 'fromData' is not an object or function.`);
    }
    if (options !== void 0 && !isObject(options) && typeof options !== "function") {
      throw new TypeError(`AnimationGroupAPI.from error: 'options' is not an object or function.`);
    }
    const animationControls = /* @__PURE__ */ new Set();
    const cleanupFn = (data) => animationControls.delete(data.control);
    let index = -1;
    let callbackOptions;
    const hasDataCallback = typeof fromData === "function";
    const hasOptionCallback = typeof options === "function";
    const hasCallback = hasDataCallback || hasOptionCallback;
    if (hasCallback) {
      callbackOptions = { index, position: void 0, entry: void 0 };
    }
    let actualFromData = fromData;
    let actualOptions = isObject(options) ? options : void 0;
    if (isIterable(positionGroup)) {
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.from warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        if (hasCallback) {
          callbackOptions.index = index;
          callbackOptions.position = actualPosition;
          callbackOptions.entry = actualPosition !== entry ? entry : void 0;
        }
        if (hasDataCallback && typeof fromData === "function") {
          actualFromData = fromData(callbackOptions);
          if (actualFromData === null || actualFromData === void 0) {
            continue;
          }
          if (!isObject(actualFromData)) {
            throw new TypeError(`AnimationGroupAPI.from error: 'fromData' callback function iteration(${index}) failed to return an object.`);
          }
        }
        if (hasOptionCallback && typeof options === "function") {
          actualOptions = options(callbackOptions);
          if (actualOptions === null || actualOptions === void 0) {
            continue;
          }
          if (!isObject(actualOptions)) {
            throw new TypeError(`AnimationGroupAPI.from error: 'options' callback function iteration(${index}) failed to return an object.`);
          }
        }
        const animationControl = AnimationScheduler.from(actualPosition, actualFromData, actualOptions, cleanupFn);
        if (animationControl) {
          animationControls.add(animationControl);
        }
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.from warning: No TJSPosition instance found.`);
        return AnimationGroupControl.voidControl;
      }
      if (hasCallback) {
        callbackOptions.index = 0;
        callbackOptions.position = actualPosition;
        callbackOptions.entry = actualPosition !== positionGroup ? positionGroup : void 0;
      }
      if (hasDataCallback && typeof fromData === "function") {
        actualFromData = fromData(callbackOptions);
        if (actualFromData === null || actualFromData === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualFromData)) {
          throw new TypeError(`AnimationGroupAPI.from error: 'fromData' callback function failed to return an object.`);
        }
      }
      if (hasOptionCallback && typeof options === "function") {
        actualOptions = options(callbackOptions);
        if (actualOptions === null || actualOptions === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualOptions)) {
          throw new TypeError(`AnimationGroupAPI.from error: 'options' callback function failed to return an object.`);
        }
      }
      const animationControl = AnimationScheduler.from(actualPosition, actualFromData, actualOptions, cleanupFn);
      if (animationControl) {
        animationControls.add(animationControl);
      }
    }
    return new AnimationGroupControl(animationControls);
  }
  /**
   * Provides the `fromTo` animation tween for one or more positionable instances as a group.
   *
   * @param positionGroup - A position group.
   *
   * @param fromData - A position data object assigned to all positionable instances or a callback function invoked for
   *        unique data for each instance.
   *
   * @param toData - A position data object assigned to all positionable instances or a callback function invoked for
   *        unique data for each instance.
   *
   * @param [options] - Tween options assigned to all positionable instances or a callback function invoked for unique
   *        options for each instance.
   *
   * @returns Basic animation control.
   */
  static fromTo(positionGroup, fromData, toData, options) {
    if (!isObject(fromData) && typeof fromData !== "function") {
      throw new TypeError(`AnimationGroupAPI.fromTo error: 'fromData' is not an object or function.`);
    }
    if (!isObject(toData) && typeof toData !== "function") {
      throw new TypeError(`AnimationGroupAPI.fromTo error: 'toData' is not an object or function.`);
    }
    if (options !== void 0 && !isObject(options) && typeof options !== "function") {
      throw new TypeError(`AnimationGroupAPI.fromTo error: 'options' is not an object or function.`);
    }
    const animationControls = /* @__PURE__ */ new Set();
    const cleanupFn = (data) => animationControls.delete(data.control);
    let index = -1;
    let callbackOptions;
    const hasFromCallback = typeof fromData === "function";
    const hasToCallback = typeof toData === "function";
    const hasOptionCallback = typeof options === "function";
    const hasCallback = hasFromCallback || hasToCallback || hasOptionCallback;
    if (hasCallback) {
      callbackOptions = { index, position: void 0, entry: void 0 };
    }
    let actualFromData = fromData;
    let actualToData = toData;
    let actualOptions = isObject(options) ? options : void 0;
    if (isIterable(positionGroup)) {
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.fromTo warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        if (hasCallback) {
          callbackOptions.index = index;
          callbackOptions.position = actualPosition;
          callbackOptions.entry = actualPosition !== entry ? entry : void 0;
        }
        if (hasFromCallback && typeof fromData === "function") {
          actualFromData = fromData(callbackOptions);
          if (actualFromData === null || actualFromData === void 0) {
            continue;
          }
          if (!isObject(actualFromData)) {
            throw new TypeError(`AnimationGroupAPI.fromTo error: 'fromData' callback function iteration(${index}) failed to return an object.`);
          }
        }
        if (hasToCallback && typeof toData === "function") {
          actualToData = toData(callbackOptions);
          if (actualToData === null || actualToData === void 0) {
            continue;
          }
          if (!isObject(actualToData)) {
            throw new TypeError(`AnimationGroupAPI.fromTo error: 'toData' callback function iteration(${index}) failed to return an object.`);
          }
        }
        if (hasOptionCallback && typeof options === "function") {
          actualOptions = options(callbackOptions);
          if (actualOptions === null || actualOptions === void 0) {
            continue;
          }
          if (!isObject(actualOptions)) {
            throw new TypeError(`AnimationGroupAPI.fromTo error: 'options' callback function iteration(${index}) failed to return an object.`);
          }
        }
        const animationControl = AnimationScheduler.fromTo(actualPosition, actualFromData, actualToData, actualOptions, cleanupFn);
        if (animationControl) {
          animationControls.add(animationControl);
        }
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.fromTo warning: No TJSPosition instance found.`);
        return AnimationGroupControl.voidControl;
      }
      if (hasCallback) {
        callbackOptions.index = 0;
        callbackOptions.position = actualPosition;
        callbackOptions.entry = actualPosition !== positionGroup ? positionGroup : void 0;
      }
      if (hasFromCallback && typeof fromData === "function") {
        actualFromData = fromData(callbackOptions);
        if (actualFromData === null || actualFromData === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualFromData)) {
          throw new TypeError(`AnimationGroupAPI.fromTo error: 'fromData' callback function failed to return an object.`);
        }
      }
      if (hasToCallback && typeof toData === "function") {
        actualToData = toData(callbackOptions);
        if (actualToData === null || actualToData === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualToData)) {
          throw new TypeError(`AnimationGroupAPI.fromTo error: 'toData' callback function failed to return an object.`);
        }
      }
      if (hasOptionCallback && typeof options === "function") {
        actualOptions = options(callbackOptions);
        if (actualOptions === null || actualOptions === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualOptions)) {
          throw new TypeError(`AnimationGroupAPI.fromTo error: 'options' callback function failed to return an object.`);
        }
      }
      const animationControl = AnimationScheduler.fromTo(actualPosition, actualFromData, actualToData, actualOptions, cleanupFn);
      if (animationControl) {
        animationControls.add(animationControl);
      }
    }
    return new AnimationGroupControl(animationControls);
  }
  /**
   * Provides the `to` animation tween for one or more positionable instances as a group.
   *
   * @param positionGroup - A position group.
   *
   * @param toData - A position data object assigned to all positionable instances or a callback function invoked for
   *        unique data for each instance.
   *
   * @param [options] - Tween options assigned to all positionable instances or a callback function invoked for unique
   *        options for each instance.
   *
   * @returns Basic animation control.
   */
  static to(positionGroup, toData, options) {
    if (!isObject(toData) && typeof toData !== "function") {
      throw new TypeError(`AnimationGroupAPI.to error: 'toData' is not an object or function.`);
    }
    if (options !== void 0 && !isObject(options) && typeof options !== "function") {
      throw new TypeError(`AnimationGroupAPI.to error: 'options' is not an object or function.`);
    }
    const animationControls = /* @__PURE__ */ new Set();
    const cleanupFn = (data) => animationControls.delete(data.control);
    let index = -1;
    let callbackOptions;
    const hasDataCallback = typeof toData === "function";
    const hasOptionCallback = typeof options === "function";
    const hasCallback = hasDataCallback || hasOptionCallback;
    if (hasCallback) {
      callbackOptions = { index, position: void 0, entry: void 0 };
    }
    let actualToData = toData;
    let actualOptions = isObject(options) ? options : void 0;
    if (isIterable(positionGroup)) {
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.to warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        if (hasCallback) {
          callbackOptions.index = index;
          callbackOptions.position = actualPosition;
          callbackOptions.entry = actualPosition !== entry ? entry : void 0;
        }
        if (hasDataCallback && typeof toData === "function") {
          actualToData = toData(callbackOptions);
          if (actualToData === null || actualToData === void 0) {
            continue;
          }
          if (!isObject(actualToData)) {
            throw new TypeError(`AnimationGroupAPI.to error: 'toData' callback function iteration(${index}) failed to return an object.`);
          }
        }
        if (hasOptionCallback && typeof options === "function") {
          actualOptions = options(callbackOptions);
          if (actualOptions === null || actualOptions === void 0) {
            continue;
          }
          if (!isObject(actualOptions)) {
            throw new TypeError(`AnimationGroupAPI.to error: 'options' callback function iteration(${index}) failed to return an object.`);
          }
        }
        const animationControl = AnimationScheduler.to(actualPosition, actualToData, actualOptions, cleanupFn);
        if (animationControl) {
          animationControls.add(animationControl);
        }
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.to warning: No TJSPosition instance found.`);
        return AnimationGroupControl.voidControl;
      }
      if (hasCallback) {
        callbackOptions.index = 0;
        callbackOptions.position = actualPosition;
        callbackOptions.entry = actualPosition !== positionGroup ? positionGroup : void 0;
      }
      if (hasDataCallback && typeof toData === "function") {
        actualToData = toData(callbackOptions);
        if (actualToData === null || actualToData === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualToData)) {
          throw new TypeError(`AnimationGroupAPI.to error: 'toData' callback function failed to return an object.`);
        }
      }
      if (hasOptionCallback && typeof options === "function") {
        actualOptions = options(callbackOptions);
        if (actualOptions === null || actualOptions === void 0) {
          return AnimationGroupControl.voidControl;
        }
        if (!isObject(actualOptions)) {
          throw new TypeError(`AnimationGroupAPI.to error: 'options' callback function failed to return an object.`);
        }
      }
      const animationControl = AnimationScheduler.to(actualPosition, actualToData, actualOptions, cleanupFn);
      if (animationControl) {
        animationControls.add(animationControl);
      }
    }
    return new AnimationGroupControl(animationControls);
  }
  /**
   * Provides the `quickTo` animation tweening function for one or more positionable instances as a group.
   *
   * @param positionGroup - A position group.
   *
   * @param keys - Animation keys to target.
   *
   * @param [options] - Quick tween options assigned to all positionable instances or a callback function invoked for
   *        unique options for each instance.
   *
   * @returns quick-to tween function.
   */
  static quickTo(positionGroup, keys, options) {
    if (!isIterable(keys)) {
      throw new TypeError(`AnimationGroupAPI.quickTo error: 'keys' is not an iterable list.`);
    }
    if (options !== void 0 && !isObject(options) && typeof options !== "function") {
      throw new TypeError(`AnimationGroupAPI.quickTo error: 'options' is not an object or function.`);
    }
    const quickToCallbacks = [];
    let index = -1;
    const hasOptionCallback = typeof options === "function";
    const callbackOptions = { index, position: void 0, entry: void 0 };
    let actualOptions = isObject(options) ? options : void 0;
    if (isIterable(positionGroup)) {
      for (const entry of positionGroup) {
        index++;
        const actualPosition = this.#getPosition(entry);
        if (!actualPosition) {
          console.warn(`AnimationGroupAPI.quickTo warning: No TJSPosition instance found at index: ${index}.`);
          continue;
        }
        callbackOptions.index = index;
        callbackOptions.position = actualPosition;
        callbackOptions.entry = actualPosition !== entry ? entry : void 0;
        if (hasOptionCallback && typeof options === "function") {
          actualOptions = options(callbackOptions);
          if (actualOptions === null || actualOptions === void 0) {
            continue;
          }
          if (!isObject(actualOptions)) {
            throw new TypeError(`AnimationGroupAPI.quickTo error: 'options' callback function iteration(${index}) failed to return an object.`);
          }
        }
        quickToCallbacks.push(actualPosition.animate.quickTo(keys, actualOptions));
      }
    } else {
      const actualPosition = this.#getPosition(positionGroup);
      if (!actualPosition) {
        console.warn(`AnimationGroupAPI.quickTo warning: No TJSPosition instance found.`);
        return;
      }
      callbackOptions.index = 0;
      callbackOptions.position = actualPosition;
      callbackOptions.entry = actualPosition !== positionGroup ? positionGroup : void 0;
      if (hasOptionCallback && typeof options === "function") {
        actualOptions = options(callbackOptions);
        if (actualOptions === null || actualOptions === void 0) {
          return;
        }
        if (!isObject(actualOptions)) {
          throw new TypeError(`AnimationGroupAPI.quickTo error: 'options' callback function failed to return an object.`);
        }
      }
      quickToCallbacks.push(actualPosition.animate.quickTo(keys, actualOptions));
    }
    const keysArray = [...keys];
    Object.freeze(keysArray);
    const quickToCB = (...args) => {
      const argsLength = args.length;
      if (argsLength === 0) {
        return;
      }
      if (typeof args[0] === "function") {
        const dataCallback = args[0];
        index = -1;
        let cntr = 0;
        if (isIterable(positionGroup)) {
          for (const entry of positionGroup) {
            index++;
            const actualPosition = this.#getPosition(entry);
            if (!actualPosition) {
              continue;
            }
            callbackOptions.index = index;
            callbackOptions.position = actualPosition;
            callbackOptions.entry = actualPosition !== entry ? entry : void 0;
            const toData = dataCallback(callbackOptions);
            if (toData === null || toData === void 0) {
              continue;
            }
            const toDataIterable = isIterable(toData);
            if (!Number.isFinite(toData) && !toDataIterable && !isObject(toData)) {
              throw new TypeError(`AnimationGroupAPI.quickTo error: 'toData' callback function iteration(${index}) failed to return a finite number, iterable list, or object.`);
            }
            if (toDataIterable) {
              quickToCallbacks[cntr++](...toData);
            } else {
              quickToCallbacks[cntr++](toData);
            }
          }
        } else {
          const actualPosition = this.#getPosition(positionGroup);
          if (!actualPosition) {
            return;
          }
          callbackOptions.index = 0;
          callbackOptions.position = actualPosition;
          callbackOptions.entry = actualPosition !== positionGroup ? positionGroup : void 0;
          const toData = dataCallback(callbackOptions);
          if (toData === null || toData === void 0) {
            return;
          }
          const toDataIterable = isIterable(toData);
          if (!Number.isFinite(toData) && !toDataIterable && !isObject(toData)) {
            throw new TypeError(`AnimationGroupAPI.quickTo error: 'toData' callback function iteration(${index}) failed to return a finite number, iterable list, or object.`);
          }
          if (toDataIterable) {
            quickToCallbacks[cntr++](...toData);
          } else {
            quickToCallbacks[cntr++](toData);
          }
        }
      } else {
        for (let cntr = quickToCallbacks.length; --cntr >= 0; ) {
          quickToCallbacks[cntr](...args);
        }
      }
    };
    Object.defineProperty(quickToCB, "keys", {
      value: keysArray,
      writable: false,
      configurable: false
    });
    Object.defineProperty(quickToCB, "options", {
      /**
       * Sets options of quickTo tween.
       * @param options -
       */
      value: (options2) => {
        if (options2 !== void 0 && !isObject(options2)) {
          throw new TypeError(`AnimationGroupAPI.quickTo error: 'options' is not an object.`);
        }
        if (isObject(options2)) {
          for (let cntr = quickToCallbacks.length; --cntr >= 0; ) {
            quickToCallbacks[cntr].options(options2);
          }
        }
        return quickToCB;
      },
      writable: false,
      configurable: false
    });
    return quickToCB;
  }
};
Object.seal(AnimationGroupAPIImpl);
var PositionStateAPI = class {
  /**
   */
  #data;
  /**
   */
  #dataSaved = /* @__PURE__ */ new Map();
  /**
   */
  #position;
  /**
   */
  #transforms;
  constructor(position, data, transforms) {
    this.#position = position;
    this.#data = data;
    this.#transforms = transforms;
    Object.seal(this);
  }
  /**
   * Clears all saved position data except any default state.
   */
  clear() {
    for (const key of this.#dataSaved.keys()) {
      if (key !== "#defaultData") {
        this.#dataSaved.delete(key);
      }
    }
  }
  /**
   * Returns any stored save state by name.
   *
   * @param options - Options.
   *
   * @param options.name - Saved data name.
   *
   * @returns Any saved position data.
   */
  get({ name }) {
    if (typeof name !== "string") {
      throw new TypeError(`TJSPosition - get error: 'name' is not a string.`);
    }
    return this.#dataSaved.get(name);
  }
  /**
   * Returns any associated default position data.
   *
   * @returns Any saved default position data.
   */
  getDefault() {
    return this.#dataSaved.get("#defaultData");
  }
  /**
   * @returns The saved position data names / keys.
   */
  keys() {
    return this.#dataSaved.keys();
  }
  /**
   * Removes and returns any position data by name.
   *
   * @param options - Options.
   *
   * @param options.name - Name to remove and retrieve.
   *
   * @returns Any saved position data.
   */
  remove({ name }) {
    if (typeof name !== "string") {
      throw new TypeError(`TJSPosition - remove: 'name' is not a string.`);
    }
    const data = this.#dataSaved.get(name);
    this.#dataSaved.delete(name);
    return data;
  }
  /**
   * Resets position instance to default data and invokes set.
   *
   * @param [options] - Optional parameters.
   *
   * @param [options.keepZIndex=false] - When true keeps current z-index.
   *
   * @param [options.invokeSet=true] - When true invokes set method.
   *
   * @returns Operation successful.
   */
  reset({ keepZIndex = false, invokeSet = true } = {}) {
    const defaultData = this.#dataSaved.get("#defaultData");
    if (!isObject(defaultData)) {
      return false;
    }
    if (this.#position.animate.isScheduled) {
      this.#position.animate.cancel();
    }
    const zIndex = this.#position.zIndex;
    const data = Object.assign({}, defaultData);
    if (keepZIndex) {
      data.zIndex = zIndex;
    }
    this.#transforms.reset(data);
    const parent = this.#position.parent;
    if (parent?.reactive?.minimized) {
      parent?.maximize?.({ animate: false, duration: 0 });
    }
    if (invokeSet) {
      setTimeout(() => this.#position.set(data), 0);
    }
    return true;
  }
  /**
   * Restores a saved positional state returning the data. Several optional parameters are available to control
   * whether the restore action occurs silently (no store / inline styles updates), animates to the stored data, or
   * simply sets the stored data. Restoring via {@link AnimationAPI.to} allows specification of the duration and
   * easing along with configuring a Promise to be returned if awaiting the end of the animation.
   *
   * @param options - Parameters
   *
   * @param options.name - Saved data set name.
   *
   * @param [options.remove=false] - Deletes data set.
   *
   * @param [options.properties] - Specific properties to set / animate.
   *
   * @param [options.silent] - Set position data directly; no store or style updates.
   *
   * @param [options.async=false] - If animating return a Promise that resolves with any saved data.
   *
   * @param [options.animateTo=false] - Animate to restore data.
   *
   * @param [options.cancelable=true] - When false, any animation can not be cancelled.
   *
   * @param [options.duration=0.1] - Duration in seconds.
   *
   * @param [options.ease='linear'] - Easing function name or function.
   *
   * @returns Any saved position data.
   */
  restore({ name, remove = false, properties, silent = false, async = false, animateTo = false, cancelable = true, duration = 0.1, ease = "linear" }) {
    if (typeof name !== "string") {
      throw new TypeError(`TJSPosition - restore error: 'name' is not a string.`);
    }
    const dataSaved = this.#dataSaved.get(name);
    if (dataSaved) {
      if (remove) {
        this.#dataSaved.delete(name);
      }
      let data = dataSaved;
      if (isIterable(properties)) {
        data = {};
        for (const property of properties) {
          data[property] = dataSaved[property];
        }
      }
      if (silent) {
        for (const property in data) {
          if (property in this.#data) {
            this.#data[property] = data[property];
          }
        }
        return dataSaved;
      } else if (animateTo) {
        if (data.transformOrigin !== this.#position.transformOrigin) {
          this.#position.transformOrigin = data.transformOrigin;
        }
        if (async) {
          return this.#position.animate.to(data, { cancelable, duration, ease }).finished.then(() => dataSaved);
        } else {
          this.#position.animate.to(data, { cancelable, duration, ease });
        }
      } else {
        this.#position.set(data);
      }
    }
    return async ? Promise.resolve(dataSaved) : dataSaved;
  }
  /**
   * Saves current position state with the opportunity to add extra data to the saved state. Simply include extra
   * properties in `options` to save extra data.
   *
   * @param options - Options.
   *
   * @param options.name - name to index this saved data.
   *
   * @param [optionsGet] - Additional options for {@link TJSPosition.get} when serializing position state. By default,
   *        `nullable` values are included.
   *
   * @returns Current position data plus any extra data stored.
   */
  save({ name, ...extra }, optionsGet) {
    if (typeof name !== "string") {
      throw new TypeError(`TJSPosition - save error: 'name' is not a string.`);
    }
    const data = this.#position.get(extra, optionsGet);
    this.#dataSaved.set(name, data);
    return data;
  }
  /**
   * Directly sets a saved position state. Simply include extra properties in `options` to set extra data.
   *
   * @param opts - Options.
   *
   * @param opts.name - name to index this saved data.
   */
  set({ name, ...data }) {
    if (typeof name !== "string") {
      throw new TypeError(`TJSPosition - set error: 'name' is not a string.`);
    }
    this.#dataSaved.set(name, data);
  }
};
var SystemBase = class {
  /**
   * When true constrains the min / max width or height to element.
   */
  #constrain;
  /**
   */
  #element;
  /**
   * When true the validator is active.
   */
  #enabled;
  /**
   * Provides a manual setting of the element height. As things go `offsetHeight` causes a browser layout and is not
   * performance oriented. If manually set this height is used instead of `offsetHeight`.
   */
  #height;
  /**
   * Set from an optional value in the constructor to lock accessors preventing modification.
   */
  #lock;
  /**
   * Stores the subscribers.
   */
  #subscribers = [];
  /**
   * Provides a manual setting of the element width. As things go `offsetWidth` causes a browser layout and is not
   * performance oriented. If manually set this width is used instead of `offsetWidth`.
   */
  #width;
  /**
   * @param [options] - Initial options.
   *
   * @param [options.constrain=true] - Initial constrained state.
   *
   * @param [options.element] - Target element.
   *
   * @param [options.enabled=true] - Enabled state.
   *
   * @param [options.lock=false] - Lock parameters from being set.
   *
   * @param [options.width] - Manual width.
   *
   * @param [options.height] - Manual height.
   */
  constructor({ constrain = true, element: element2, enabled = true, lock = false, width, height } = {}) {
    this.#constrain = true;
    this.#enabled = true;
    this.constrain = constrain;
    this.element = element2;
    this.enabled = enabled;
    this.width = width;
    this.height = height;
    this.#lock = typeof lock === "boolean" ? lock : false;
  }
  /**
   * @returns The current constrain state.
   */
  get constrain() {
    return this.#constrain;
  }
  /**
   * @returns Target element.
   */
  get element() {
    return this.#element;
  }
  /**
   * @returns The current enabled state.
   */
  get enabled() {
    return this.#enabled;
  }
  /**
   * @returns Get manual height.
   */
  get height() {
    return this.#height;
  }
  /**
   * @return Get locked state.
   */
  get locked() {
    return this.#lock;
  }
  /**
   * @returns Get manual width.
   */
  get width() {
    return this.#width;
  }
  /**
   * @param constrain - New constrain state.
   */
  set constrain(constrain) {
    if (this.#lock) {
      return;
    }
    if (typeof constrain !== "boolean") {
      throw new TypeError(`'constrain' is not a boolean.`);
    }
    this.#constrain = constrain;
    this.#updateSubscribers();
  }
  /**
   * @param element - Set target element.
   */
  set element(element2) {
    if (this.#lock) {
      return;
    }
    if (element2 === void 0 || element2 === null || A11yHelper.isFocusTarget(element2)) {
      this.#element = element2;
    } else {
      throw new TypeError(`'element' is not a HTMLElement, undefined, or null.`);
    }
    this.#updateSubscribers();
  }
  /**
   * @param enabled - New enabled state.
   */
  set enabled(enabled) {
    if (this.#lock) {
      return;
    }
    if (typeof enabled !== "boolean") {
      throw new TypeError(`'enabled' is not a boolean.`);
    }
    this.#enabled = enabled;
    this.#updateSubscribers();
  }
  /**
   * @param height - Set manual height.
   */
  set height(height) {
    if (this.#lock) {
      return;
    }
    if (height === void 0 || Number.isFinite(height)) {
      this.#height = height;
    } else {
      throw new TypeError(`'height' is not a finite number or undefined.`);
    }
    this.#updateSubscribers();
  }
  /**
   * @param width - Set manual width.
   */
  set width(width) {
    if (this.#lock) {
      return;
    }
    if (width === void 0 || Number.isFinite(width)) {
      this.#width = width;
    } else {
      throw new TypeError(`'width' is not a finite number or undefined.`);
    }
    this.#updateSubscribers();
  }
  /**
   * Set manual width & height.
   *
   * @param width - New manual width.
   *
   * @param height - New manual height.
   */
  setDimension(width, height) {
    if (this.#lock) {
      return;
    }
    if (width === void 0 || Number.isFinite(width)) {
      this.#width = width;
    } else {
      throw new TypeError(`'width' is not a finite number or undefined.`);
    }
    if (height === void 0 || Number.isFinite(height)) {
      this.#height = height;
    } else {
      throw new TypeError(`'height' is not a finite number or undefined.`);
    }
    this.#updateSubscribers();
  }
  /**
   * @param handler - Callback function that is invoked on update / changes. Receives a copy of the TJSPositionData.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      handler(this);
    }
    return () => {
      const existingIdx = this.#subscribers.findIndex((entry) => entry === handler);
      if (existingIdx !== -1) {
        this.#subscribers.splice(existingIdx, 1);
      }
    };
  }
  /**
   * Updates subscribers on changes.
   */
  #updateSubscribers() {
    for (let cntr = 0; cntr < this.#subscribers.length; cntr++) {
      this.#subscribers[cntr](this);
    }
  }
};
var Centered = class extends SystemBase {
  /**
   * Get the left constraint based on any manual target values or the browser inner width.
   *
   * @param width - Target width.
   *
   * @returns Calculated left constraint.
   */
  getLeft(width) {
    const boundsWidth = this.width ?? this.element?.offsetWidth ?? globalThis.innerWidth;
    return (boundsWidth - width) / 2;
  }
  /**
   * Get the top constraint based on any manual target values or the browser inner height.
   *
   * @param height - Target height.
   *
   * @returns Calculated top constraint.
   */
  getTop(height) {
    const boundsHeight = this.height ?? this.element?.offsetHeight ?? globalThis.innerHeight;
    return (boundsHeight - height) / 2;
  }
};
var AdapterValidators = class _AdapterValidators {
  /**
   */
  #enabled = true;
  /**
   */
  #validatorData;
  /**
   */
  #mapUnsubscribe = /* @__PURE__ */ new Map();
  #updateFn;
  /**
   * @returns Returns this and internal storage for validator adapter.
   */
  static create(updateFn) {
    const validatorAPI = new _AdapterValidators(updateFn);
    return [validatorAPI, validatorAPI.#validatorData];
  }
  /**
   */
  constructor(updateFn) {
    this.#validatorData = [];
    this.#updateFn = updateFn;
    Object.seal(this);
  }
  /**
   * @returns Returns the enabled state.
   */
  get enabled() {
    return this.#enabled;
  }
  /**
   * @returns Returns the length of the validators array.
   */
  get length() {
    return this.#validatorData.length;
  }
  /**
   * @param enabled - Sets enabled state.
   */
  set enabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new TypeError(`'enabled' is not a boolean.`);
    }
    this.#enabled = enabled;
  }
  /**
   * Provides an iterator for validators.
   *
   * @returns iterator.
   */
  *[Symbol.iterator]() {
    if (this.#validatorData.length === 0) {
      return;
    }
    for (const entry of this.#validatorData) {
      yield { ...entry };
    }
  }
  /**
   * Adds the given validators.
   *
   * @param validators - Validators to add.
   */
  add(...validators) {
    let subscribeCount = 0;
    for (const validator of validators) {
      const validatorType = typeof validator;
      if (validatorType !== "function" && validatorType !== "object" || validator === null) {
        throw new TypeError(`AdapterValidator error: 'validator' is not a function or object.`);
      }
      let data = void 0;
      let subscribeFn = void 0;
      switch (validatorType) {
        case "function":
          data = {
            id: void 0,
            validate: validator,
            weight: 1
          };
          subscribeFn = validator.subscribe;
          break;
        case "object":
          if ("validate" in validator) {
            if (typeof validator.validate !== "function") {
              throw new TypeError(`AdapterValidator error: 'validate' attribute is not a function.`);
            }
            if (validator.weight !== void 0 && typeof validator.weight !== "number" || (validator?.weight < 0 || validator?.weight > 1)) {
              throw new TypeError(`AdapterValidator error: 'weight' attribute is not a number between '0 - 1' inclusive.`);
            }
            data = {
              id: validator.id !== void 0 ? validator.id : void 0,
              validate: validator.validate.bind(validator),
              weight: validator.weight || 1
            };
            subscribeFn = validator.validate.subscribe ?? validator.subscribe;
          } else {
            throw new TypeError(`AdapterValidator error: 'validate' attribute is not a function.`);
          }
          break;
      }
      const index = this.#validatorData.findIndex((value) => data.weight < value.weight);
      if (index >= 0) {
        this.#validatorData.splice(index, 0, data);
      } else {
        this.#validatorData.push(data);
      }
      if (typeof subscribeFn === "function") {
        const unsubscribe = subscribeFn.call(validator, this.#updateFn);
        if (typeof unsubscribe !== "function") {
          throw new TypeError("AdapterValidator error: Validator has subscribe function, but no unsubscribe function is returned.");
        }
        if (this.#mapUnsubscribe.has(data.validate)) {
          throw new Error("AdapterValidator error: Validator added already has an unsubscribe function registered.");
        }
        this.#mapUnsubscribe.set(data.validate, unsubscribe);
        subscribeCount++;
      }
    }
    if (subscribeCount < validators.length) {
      this.#updateFn();
    }
  }
  /**
   * Clears / removes all validators.
   */
  clear() {
    this.#validatorData.length = 0;
    for (const unsubscribe of this.#mapUnsubscribe.values()) {
      unsubscribe();
    }
    this.#mapUnsubscribe.clear();
    this.#updateFn();
  }
  /**
   * Removes one or more given validators.
   *
   * @param validators - Validators to remove.
   */
  remove(...validators) {
    const length = this.#validatorData.length;
    if (length === 0) {
      return;
    }
    for (const data of validators) {
      const actualValidator = typeof data === "function" ? data : isObject(data) ? data.validate : void 0;
      if (!actualValidator) {
        continue;
      }
      for (let cntr = this.#validatorData.length; --cntr >= 0; ) {
        if (this.#validatorData[cntr].validate === actualValidator) {
          this.#validatorData.splice(cntr, 1);
          let unsubscribe = void 0;
          if (typeof (unsubscribe = this.#mapUnsubscribe.get(actualValidator)) === "function") {
            unsubscribe();
            this.#mapUnsubscribe.delete(actualValidator);
          }
        }
      }
    }
    if (length !== this.#validatorData.length) {
      this.#updateFn();
    }
  }
  /**
   * Remove validators by the provided callback. The callback takes 3 parameters: `id`, `validator`, and `weight`.
   * Any truthy value returned will remove that validator.
   *
   * @param callback - Callback function to evaluate each validator entry.
   */
  removeBy(callback) {
    const length = this.#validatorData.length;
    if (length === 0) {
      return;
    }
    if (typeof callback !== "function") {
      throw new TypeError(`AdapterValidator error: 'callback' is not a function.`);
    }
    this.#validatorData = this.#validatorData.filter((data) => {
      const remove = callback.call(callback, { ...data });
      if (remove) {
        let unsubscribe;
        if (typeof (unsubscribe = this.#mapUnsubscribe.get(data.validate)) === "function") {
          unsubscribe();
          this.#mapUnsubscribe.delete(data.validate);
        }
      }
      return !remove;
    });
    if (length !== this.#validatorData.length) {
      this.#updateFn();
    }
  }
  /**
   * Removes any validators with matching IDs.
   *
   * @param ids - IDs to remove.
   */
  removeById(...ids) {
    const length = this.#validatorData.length;
    if (length === 0) {
      return;
    }
    this.#validatorData = this.#validatorData.filter((data) => {
      let remove = false;
      for (const id of ids) {
        remove ||= data.id === id;
      }
      if (remove) {
        let unsubscribe;
        if (typeof (unsubscribe = this.#mapUnsubscribe.get(data.validate)) === "function") {
          unsubscribe();
          this.#mapUnsubscribe.delete(data.validate);
        }
      }
      return !remove;
    });
    if (length !== this.#validatorData.length) {
      this.#updateFn();
    }
  }
};
var TransformBounds = class _TransformBounds extends SystemBase {
  static #TRANSFORM_DATA = new TJSTransformData();
  /**
   * Provides a validator that respects transforms in positional data constraining the position to within the target
   * elements bounds.
   *
   * @param valData - The associated validation data for position updates.
   *
   * @returns Potentially adjusted position data.
   */
  validate(valData) {
    if (!this.enabled) {
      return valData.position;
    }
    const boundsWidth = this.width ?? this.element?.offsetWidth ?? globalThis.innerWidth;
    const boundsHeight = this.height ?? this.element?.offsetHeight ?? globalThis.innerHeight;
    if (typeof valData.position.width === "number") {
      const maxW = valData.maxWidth ?? (this.constrain ? boundsWidth : Number.MAX_SAFE_INTEGER);
      valData.position.width = clamp(valData.width, valData.minWidth, maxW);
    }
    if (typeof valData.position.height === "number") {
      const maxH = valData.maxHeight ?? (this.constrain ? boundsHeight : Number.MAX_SAFE_INTEGER);
      valData.position.height = clamp(valData.height, valData.minHeight, maxH);
    }
    const data = valData.transforms.getData(valData.position, _TransformBounds.#TRANSFORM_DATA, valData);
    const initialX = data.boundingRect.x;
    const initialY = data.boundingRect.y;
    const marginTop = valData.marginTop ?? 0;
    const marginLeft = valData.marginLeft ?? 0;
    if (data.boundingRect.bottom + marginTop > boundsHeight) {
      data.boundingRect.y += boundsHeight - data.boundingRect.bottom - marginTop;
    }
    if (data.boundingRect.right + marginLeft > boundsWidth) {
      data.boundingRect.x += boundsWidth - data.boundingRect.right - marginLeft;
    }
    if (data.boundingRect.top - marginTop < 0) {
      data.boundingRect.y += Math.abs(data.boundingRect.top - marginTop);
    }
    if (data.boundingRect.left - marginLeft < 0) {
      data.boundingRect.x += Math.abs(data.boundingRect.left - marginLeft);
    }
    valData.position.left -= initialX - data.boundingRect.x;
    valData.position.top -= initialY - data.boundingRect.y;
    return valData.position;
  }
};
var PositionChangeSet = class {
  left;
  top;
  width;
  height;
  maxHeight;
  maxWidth;
  minHeight;
  minWidth;
  zIndex;
  transform;
  transformOrigin;
  constructor() {
    this.left = false;
    this.top = false;
    this.width = false;
    this.height = false;
    this.maxHeight = false;
    this.maxWidth = false;
    this.minHeight = false;
    this.minWidth = false;
    this.zIndex = false;
    this.transform = false;
    this.transformOrigin = false;
  }
  hasChange() {
    return this.left || this.top || this.width || this.height || this.maxHeight || this.maxWidth || this.minHeight || this.minWidth || this.zIndex || this.transform || this.transformOrigin;
  }
  set(value) {
    this.left = value;
    this.top = value;
    this.width = value;
    this.height = value;
    this.maxHeight = value;
    this.maxWidth = value;
    this.minHeight = value;
    this.minWidth = value;
    this.zIndex = value;
    this.transform = value;
    this.transformOrigin = value;
  }
};
var UpdateElementData = class {
  changeSet;
  data;
  dataSubscribers;
  dimensionData;
  options;
  queued;
  storeDimension;
  storeTransform;
  styleCache;
  subscribers;
  transforms;
  transformData;
  constructor(changeSet, data, options, styleCache, subscribers, transforms) {
    this.changeSet = changeSet;
    this.data = data;
    this.dataSubscribers = Object.seal(new TJSPositionData());
    this.dimensionData = Object.seal({ width: 0, height: 0 });
    this.options = options;
    this.queued = false;
    this.styleCache = styleCache;
    this.storeDimension = writable(this.dimensionData);
    this.subscribers = subscribers;
    this.transforms = transforms;
    this.transformData = new TJSTransformData();
    this.storeTransform = writable(this.transformData, () => {
      this.options.transformSubscribed = true;
      return () => this.options.transformSubscribed = false;
    });
  }
};
var UpdateElementManager = class _UpdateElementManager {
  /**
   * Stores the active list of all TJSPosition instances currently updating. The list entries are recycled between
   * updates.
   */
  static list = [];
  /**
   * Tracks the current position in the list.
   */
  static listCntr = 0;
  static updatePromise;
  /**
   * Potentially adds the given element and internal updateData instance to the list.
   *
   * @param el - An HTMLElement instance.
   *
   * @param updateData - An UpdateElementData instance.
   *
   * @returns The unified next frame update promise. Returns `currentTime`.
   */
  static add(el, updateData) {
    if (this.listCntr < this.list.length) {
      const entry = this.list[this.listCntr];
      entry[0] = el;
      entry[1] = updateData;
    } else {
      this.list.push([el, updateData]);
    }
    this.listCntr++;
    updateData.queued = true;
    if (!this.updatePromise) {
      this.updatePromise = this.wait();
    }
    return this.updatePromise;
  }
  /**
   * Await on `nextAnimationFrame` and iterate over list map invoking callback functions.
   *
   * @returns The next frame Promise / currentTime from nextAnimationFrame.
   */
  static async wait() {
    const currentTime = await nextAnimationFrame();
    this.updatePromise = void 0;
    for (let cntr = this.listCntr; --cntr >= 0; ) {
      const entry = this.list[cntr];
      const el = entry[0];
      const updateData = entry[1];
      entry[0] = void 0;
      entry[1] = void 0;
      updateData.queued = false;
      if (!el.isConnected) {
        continue;
      }
      if (updateData.options.ortho) {
        _UpdateElementManager.#updateElementOrtho(el, updateData);
      } else {
        _UpdateElementManager.#updateElement(el, updateData);
      }
      if (updateData.options.calculateTransform || updateData.options.transformSubscribed) {
        _UpdateElementManager.#updateTransform(updateData);
      }
      this.updateSubscribers(updateData);
    }
    this.listCntr = 0;
    return currentTime;
  }
  /**
   * Potentially immediately updates the given element.
   *
   * @param el - An HTMLElement instance.
   *
   * @param updateData - An UpdateElementData instance.
   */
  static immediate(el, updateData) {
    if (!el.isConnected) {
      return;
    }
    if (updateData.options.ortho) {
      _UpdateElementManager.#updateElementOrtho(el, updateData);
    } else {
      _UpdateElementManager.#updateElement(el, updateData);
    }
    if (updateData.options.calculateTransform || updateData.options.transformSubscribed) {
      _UpdateElementManager.#updateTransform(updateData);
    }
    this.updateSubscribers(updateData);
  }
  /**
   * @param updateData - Data change set.
   */
  static updateSubscribers(updateData) {
    const data = updateData.data;
    const changeSet = updateData.changeSet;
    if (!changeSet.hasChange()) {
      return;
    }
    const output = TJSPositionDataUtil.copyData(data, updateData.dataSubscribers);
    const subscribers = updateData.subscribers;
    if (subscribers.length > 0) {
      for (let cntr = 0; cntr < subscribers.length; cntr++) {
        subscribers[cntr](output);
      }
    }
    if (changeSet.width || changeSet.height) {
      updateData.dimensionData.width = data.width;
      updateData.dimensionData.height = data.height;
      updateData.storeDimension.set(updateData.dimensionData);
    }
    changeSet.set(false);
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Temporary data for validation.
   */
  static #validationData = Object.seal({
    height: 0,
    width: 0,
    marginLeft: 0,
    marginTop: 0
  });
  /**
   * Decouples updates to any parent target HTMLElement inline styles. Invoke {@link TJSPosition.elementUpdated} to
   * await on the returned promise that is resolved with the current render time via `nextAnimationFrame` /
   * `requestAnimationFrame`. This allows the underlying data model to be updated immediately while updates to the
   * element are in sync with the browser and potentially in the future be further throttled.
   *
   * @param el - The target HTMLElement.
   *
   * @param updateData - Update data.
   */
  static #updateElement(el, updateData) {
    const changeSet = updateData.changeSet;
    const data = updateData.data;
    if (changeSet.left) {
      el.style.left = `${data.left}px`;
    }
    if (changeSet.top) {
      el.style.top = `${data.top}px`;
    }
    if (changeSet.zIndex) {
      el.style.zIndex = typeof data.zIndex === "number" ? `${data.zIndex}` : "";
    }
    if (changeSet.width) {
      el.style.width = typeof data.width === "number" ? `${data.width}px` : data.width;
    }
    if (changeSet.height) {
      el.style.height = typeof data.height === "number" ? `${data.height}px` : data.height;
    }
    if (changeSet.transformOrigin) {
      el.style.transformOrigin = data.transformOrigin;
    }
    if (changeSet.transform) {
      el.style.transform = updateData.transforms.isActive ? updateData.transforms.getCSS() : "";
    }
  }
  /**
   * Decouples updates to any parent target HTMLElement inline styles. Invoke {@link TJSPosition.elementUpdated} to
   * await on the returned promise that is resolved with the current render time via `nextAnimationFrame` /
   * `requestAnimationFrame`. This allows the underlying data model to be updated immediately while updates to the
   * element are in sync with the browser and potentially in the future be further throttled.
   *
   * @param el - The target HTMLElement.
   *
   * @param updateData - Update data.
   */
  static #updateElementOrtho(el, updateData) {
    const changeSet = updateData.changeSet;
    const data = updateData.data;
    if (changeSet.zIndex) {
      el.style.zIndex = typeof data.zIndex === "number" ? `${data.zIndex}` : "";
    }
    if (changeSet.width) {
      el.style.width = typeof data.width === "number" ? `${data.width}px` : data.width;
    }
    if (changeSet.height) {
      el.style.height = typeof data.height === "number" ? `${data.height}px` : data.height;
    }
    if (changeSet.transformOrigin) {
      el.style.transformOrigin = data.transformOrigin;
    }
    if (changeSet.left || changeSet.top || changeSet.transform) {
      el.style.transform = updateData.transforms.getCSSOrtho(data);
    }
  }
  /**
   * Updates the applied transform data and sets the readable `transform` store.
   *
   * @param updateData - Update element data.
   */
  static #updateTransform(updateData) {
    const validationData = this.#validationData;
    validationData.height = updateData.data.height !== "auto" && updateData.data.height !== "inherit" ? updateData.data.height : updateData.styleCache.offsetHeight;
    validationData.width = updateData.data.width !== "auto" && updateData.data.width !== "inherit" ? updateData.data.width : updateData.styleCache.offsetWidth;
    validationData.marginLeft = updateData.styleCache.marginLeft;
    validationData.marginTop = updateData.styleCache.marginTop;
    updateData.transforms.getData(updateData.data, updateData.transformData, validationData);
    updateData.storeTransform.set(updateData.transformData);
  }
};
var _a2;
var TJSPosition = class {
  /**
   * Public API for {@link TJSPosition.Initial}.
   */
  static #positionInitial = Object.freeze({
    browserCentered: new Centered({ lock: true }),
    Centered
  });
  /**
   * Public API for {@link TJSPosition.Validators}
   */
  static #positionValidators = Object.freeze({
    TransformBounds,
    transformWindow: new TransformBounds({ lock: true })
  });
  /**
   * Stores all position data / properties.
   */
  #data = Object.seal(new TJSPositionData());
  /**
   * Provides the animation API.
   */
  #animate = new AnimationAPIImpl(this, this.#data);
  /**
   * Provides a way to turn on / off the position handling.
   */
  #enabled = true;
  /**
   * Stores ongoing options that are set in the constructor or by transform store subscription.
   */
  #options = {
    calculateTransform: false,
    initial: void 0,
    ortho: true,
    transformSubscribed: false
  };
  /**
   * The associated parent for positional data tracking. Used in validators.
   */
  #parent;
  /**
   * Stores the style attributes that changed on update.
   */
  #positionChangeSet = new PositionChangeSet();
  /**
   * Tracks the current state if this position instance is a candidate for resize observation by the `resizeObserver`
   * action. This is `true` when `width` or `height` is `auto` or `inherit`.
   */
  #resizeObservable = false;
  /**
   */
  #stores;
  /**
   * Stores an instance of the computer styles for the target element.
   */
  #styleCache;
  /**
   * Stores the subscribers.
   */
  #subscribers = [];
  /**
   */
  #transforms = new TJSTransforms();
  /**
   */
  #updateElementData;
  /**
   * Stores the UpdateElementManager wait promise.
   */
  #updateElementPromise;
  /**
   */
  #validators;
  /**
   */
  #validatorData;
  /**
   */
  #state = new PositionStateAPI(this, this.#data, this.#transforms);
  /**
   * @returns Public Animation Group API.
   */
  static get Animate() {
    return AnimationGroupAPIImpl;
  }
  /**
   * @returns TJSPositionData constructor.
   */
  static get Data() {
    return TJSPositionData;
  }
  /**
   * @returns TJSPosition default initial systems.
   */
  static get Initial() {
    return this.#positionInitial;
  }
  /**
   * @returns `SystemBase` constructor.
   */
  static get SystemBase() {
    return SystemBase;
  }
  /**
   * Returns TJSTransformData class / constructor.
   *
   * @returns TransformData class / constructor.
   */
  static get TransformData() {
    return TJSTransformData;
  }
  /**
   * Returns default validator systems.
   *
   * @returns Available validators.
   */
  static get Validators() {
    return this.#positionValidators;
  }
  /**
   * Returns a list of supported transform origins.
   *
   * @returns The supported transform origin strings.
   */
  static get transformOrigins() {
    return TJSTransforms.transformOrigins;
  }
  /**
   * Convenience to copy from source to target of two TJSPositionData like objects. If a target is not supplied a new
   * {@link TJSPositionData} instance is created.
   *
   * @param source - The source instance to copy from.
   *
   * @param [target] - Target TJSPositionData like object; if one is not provided a new instance is created.
   *
   * @returns The target instance with all TJSPositionData fields.
   */
  static copyData(source, target) {
    return TJSPositionDataUtil.copyData(source, target);
  }
  /**
   * Returns a duplicate of a given position instance copying any options and validators. The position parent is not
   * copied, and a new one must be set manually via the {@link TJSPosition.parent} setter.
   *
   * @param position - A position instance.
   *
   * @param [options] - Unique new options to set.
   *
   * @returns A duplicate position instance.
   */
  static duplicate(position, options = {}) {
    if (!(position instanceof _a2)) {
      throw new TypeError(`'position' is not an instance of TJSPosition.`);
    }
    const newPosition = new _a2(options);
    newPosition.#options = Object.assign({}, position.#options, options);
    newPosition.#validators.add(...position.#validators);
    newPosition.set(position.#data);
    return newPosition;
  }
  /**
   * @param [parentOrOptions] - A potential parent element or object w/ `elementTarget` accessor. You may also forego
   *        setting the parent and pass in the configuration options object.
   *
   * @param [options] - The configuration options object.
   */
  constructor(parentOrOptions, options) {
    if (isPlainObject(parentOrOptions)) {
      options = parentOrOptions;
    } else {
      this.#parent = parentOrOptions;
    }
    this.#styleCache = new TJSPositionStyleCache();
    const updateData = new UpdateElementData(this.#positionChangeSet, this.#data, this.#options, this.#styleCache, this.#subscribers, this.#transforms);
    this.#updateElementData = updateData;
    if (typeof options?.calculateTransform === "boolean") {
      this.#options.calculateTransform = options.calculateTransform;
    }
    if (typeof options?.ortho === "boolean") {
      this.#options.ortho = options.ortho;
    }
    this.#stores = Object.freeze({
      // The main properties for manipulating TJSPosition.
      height: propertyStore(this, "height"),
      left: propertyStore(this, "left"),
      rotateX: propertyStore(this, "rotateX"),
      rotateY: propertyStore(this, "rotateY"),
      rotateZ: propertyStore(this, "rotateZ"),
      scale: propertyStore(this, "scale"),
      top: propertyStore(this, "top"),
      transformOrigin: propertyStore(this, "transformOrigin"),
      translateX: propertyStore(this, "translateX"),
      translateY: propertyStore(this, "translateY"),
      translateZ: propertyStore(this, "translateZ"),
      width: propertyStore(this, "width"),
      zIndex: propertyStore(this, "zIndex"),
      // Stores that control validation when width / height is not `auto`.
      maxHeight: propertyStore(this, "maxHeight"),
      maxWidth: propertyStore(this, "maxWidth"),
      minHeight: propertyStore(this, "minHeight"),
      minWidth: propertyStore(this, "minWidth"),
      // Readable stores based on updates or from resize observer changes.
      dimension: { subscribe: updateData.storeDimension.subscribe },
      element: { subscribe: this.#styleCache.stores.element.subscribe },
      resizeContentHeight: { subscribe: this.#styleCache.stores.resizeContentHeight.subscribe },
      resizeContentWidth: { subscribe: this.#styleCache.stores.resizeContentWidth.subscribe },
      resizeObservable: { subscribe: this.#styleCache.stores.resizeObservable.subscribe },
      resizeOffsetHeight: { subscribe: this.#styleCache.stores.resizeOffsetHeight.subscribe },
      resizeOffsetWidth: { subscribe: this.#styleCache.stores.resizeOffsetWidth.subscribe },
      transform: { subscribe: updateData.storeTransform.subscribe },
      // Protected store that should only be set by resizeObserver action.
      resizeObserved: this.#styleCache.stores.resizeObserved
    });
    Object.defineProperty(this.#stores.transformOrigin, "values", {
      get: () => _a2.transformOrigins
    });
    subscribeIgnoreFirst(this.#stores.resizeObserved, (resizeData) => {
      const parent = this.#parent;
      const el = A11yHelper.isFocusTarget(parent) ? parent : parent?.elementTarget;
      if (A11yHelper.isFocusTarget(el) && Number.isFinite(resizeData?.offsetWidth) && Number.isFinite(resizeData?.offsetHeight)) {
        this.set();
      }
    });
    [this.#validators, this.#validatorData] = AdapterValidators.create(() => this.set());
    if (options?.initial) {
      const initial = options.initial;
      if (typeof initial?.getLeft !== "function" || typeof initial?.getTop !== "function") {
        throw new Error(`'options.initial' position helper does not contain 'getLeft' and / or 'getTop' functions.`);
      }
      this.#options.initial = initial;
    }
    if (options?.validator) {
      if (isIterable(options?.validator)) {
        this.validators.add(...options.validator);
      } else {
        const validatorFn = options.validator;
        this.validators.add(validatorFn);
      }
    }
    Object.seal(this);
    if (isObject(options)) {
      this.set(options);
    }
  }
  /**
   * Returns the animation API.
   *
   * @returns Animation instance API.
   */
  get animate() {
    return this.#animate;
  }
  /**
   * Returns the dimension data for the readable store.
   *
   * @returns Dimension data.
   */
  get dimension() {
    return this.#updateElementData.dimensionData;
  }
  /**
   * Returns the enabled state.
   *
   * @returns Enabled state.
   */
  get enabled() {
    return this.#enabled;
  }
  /**
   * Returns the current HTMLElement being positioned.
   *
   * @returns Current HTMLElement being positioned.
   */
  get element() {
    return this.#styleCache.el;
  }
  /**
   * Returns a promise that is resolved on the next element update with the time of the update.
   *
   * @returns Promise resolved on element update.
   */
  get elementUpdated() {
    return this.#updateElementPromise;
  }
  /**
   * Returns the associated {@link TJSPosition.PositionParent} instance.
   *
   * @returns The current position parent instance.
   */
  get parent() {
    return this.#parent;
  }
  /**
   * Returns the state API.
   *
   * @returns TJSPosition state API.
   */
  get state() {
    return this.#state;
  }
  /**
   * Returns the derived writable stores for individual data variables.
   *
   * @returns Derived / writable stores.
   */
  get stores() {
    return this.#stores;
  }
  /**
   * Returns the transform data for the readable store.
   *
   * @returns Transform Data.
   */
  get transform() {
    return this.#updateElementData.transformData;
  }
  /**
   * Returns the validators.
   *
   * @returns Validators API
   */
  get validators() {
    return this.#validators;
  }
  /**
   * Sets the enabled state.
   *
   * @param enabled - Newly enabled state.
   */
  set enabled(enabled) {
    if (typeof enabled !== "boolean") {
      throw new TypeError(`'enabled' is not a boolean.`);
    }
    this.#enabled = enabled;
  }
  /**
   * Sets the associated {@link TJSPosition.PositionParent} instance. Resets the style cache and default data.
   *
   * @param parent - A PositionParent instance or undefined to disassociate
   */
  set parent(parent) {
    if (parent !== void 0 && !A11yHelper.isFocusTarget(parent) && !isObject(parent)) {
      throw new TypeError(`'parent' is not an HTMLElement, object, or undefined.`);
    }
    this.#parent = parent;
    this.#state.remove({ name: "#defaultData" });
    this.#styleCache.reset();
    if (parent) {
      this.set(this.#data);
    }
  }
  // Data accessors ----------------------------------------------------------------------------------------------------
  /**
   * @returns height
   */
  get height() {
    return this.#data.height;
  }
  /**
   * @returns left
   */
  get left() {
    return this.#data.left;
  }
  /**
   * @returns maxHeight
   */
  get maxHeight() {
    return this.#data.maxHeight;
  }
  /**
   * @returns maxWidth
   */
  get maxWidth() {
    return this.#data.maxWidth;
  }
  /**
   * @returns minHeight
   */
  get minHeight() {
    return this.#data.minHeight;
  }
  /**
   * @returns minWidth
   */
  get minWidth() {
    return this.#data.minWidth;
  }
  /**
   * @returns rotateX
   */
  get rotateX() {
    return this.#data.rotateX;
  }
  /**
   * @returns rotateY
   */
  get rotateY() {
    return this.#data.rotateY;
  }
  /**
   * @returns rotateZ
   */
  get rotateZ() {
    return this.#data.rotateZ;
  }
  /**
   * @returns Alias for rotateZ
   */
  get rotation() {
    return this.#data.rotateZ;
  }
  /**
   * @returns scale
   */
  get scale() {
    return this.#data.scale;
  }
  /**
   * @returns top
   */
  get top() {
    return this.#data.top;
  }
  /**
   * @returns transformOrigin
   */
  get transformOrigin() {
    return this.#data.transformOrigin;
  }
  /**
   * @returns translateX
   */
  get translateX() {
    return this.#data.translateX;
  }
  /**
   * @returns translateY
   */
  get translateY() {
    return this.#data.translateY;
  }
  /**
   * @returns translateZ
   */
  get translateZ() {
    return this.#data.translateZ;
  }
  /**
   * @returns width
   */
  get width() {
    return this.#data.width;
  }
  /**
   * @returns z-index
   */
  get zIndex() {
    return this.#data.zIndex;
  }
  /**
   * @param height -
   */
  set height(height) {
    this.#stores.height.set(height);
  }
  /**
   * @param left -
   */
  set left(left) {
    this.#stores.left.set(left);
  }
  /**
   * @param maxHeight -
   */
  set maxHeight(maxHeight) {
    this.#stores.maxHeight.set(maxHeight);
  }
  /**
   * @param maxWidth -
   */
  set maxWidth(maxWidth) {
    this.#stores.maxWidth.set(maxWidth);
  }
  /**
   * @param minHeight -
   */
  set minHeight(minHeight) {
    this.#stores.minHeight.set(minHeight);
  }
  /**
   * @param minWidth -
   */
  set minWidth(minWidth) {
    this.#stores.minWidth.set(minWidth);
  }
  /**
   * @param rotateX -
   */
  set rotateX(rotateX) {
    this.#stores.rotateX.set(rotateX);
  }
  /**
   * @param rotateY -
   */
  set rotateY(rotateY) {
    this.#stores.rotateY.set(rotateY);
  }
  /**
   * @param rotateZ -
   */
  set rotateZ(rotateZ) {
    this.#stores.rotateZ.set(rotateZ);
  }
  /**
   * @param  rotateZ - alias for rotateZ
   */
  set rotation(rotateZ) {
    this.#stores.rotateZ.set(rotateZ);
  }
  /**
   * @param scale -
   */
  set scale(scale) {
    this.#stores.scale.set(scale);
  }
  /**
   * @param top -
   */
  set top(top) {
    this.#stores.top.set(top);
  }
  /**
   * @param transformOrigin -
   */
  set transformOrigin(transformOrigin) {
    if (TJSTransforms.transformOrigins.includes(transformOrigin)) {
      this.#stores.transformOrigin.set(transformOrigin);
    }
  }
  /**
   * @param translateX -
   */
  set translateX(translateX) {
    this.#stores.translateX.set(translateX);
  }
  /**
   * @param translateY -
   */
  set translateY(translateY) {
    this.#stores.translateY.set(translateY);
  }
  /**
   * @param translateZ -
   */
  set translateZ(translateZ) {
    this.#stores.translateZ.set(translateZ);
  }
  /**
   * @param width -
   */
  set width(width) {
    this.#stores.width.set(width);
  }
  /**
   * @param zIndex -
   */
  set zIndex(zIndex) {
    this.#stores.zIndex.set(zIndex);
  }
  /**
   * Assigns current position data to the given object `data` object. By default, `null` position data is not assigned.
   * Other options allow configuration of the data assigned, including setting default numeric values for any
   * properties that are null.
   *
   * @param [data] - Target to assign current position data.
   *
   * @param [options] - Defines options for specific keys and substituting null for numeric default values. By
   *        default, nullable keys are included.
   *
   * @returns Any passed in data object with current position data.
   */
  get(data = {}, options = {}) {
    const keys = options?.keys;
    const excludeKeys = options?.exclude;
    const nullable = options?.nullable ?? true;
    const numeric = options?.numeric ?? false;
    if (isIterable(keys)) {
      for (const key of keys) {
        data[key] = numeric ? TJSPositionDataUtil.getDataOrDefault(this, key) : this[key];
        if (!nullable && data[key] === null) {
          delete data[key];
        }
      }
      if (isIterable(excludeKeys)) {
        for (const key of excludeKeys) {
          delete data[key];
        }
      }
      return data;
    } else {
      data = Object.assign(data, this.#data);
      if (isIterable(excludeKeys)) {
        for (const key of excludeKeys) {
          delete data[key];
        }
      }
      if (numeric) {
        TJSPositionDataUtil.setNumericDefaults(data);
      }
      if (!nullable) {
        for (const key in data) {
          if (data[key] === null) {
            delete data[key];
          }
        }
      }
      return data;
    }
  }
  /**
   * @returns Current position data.
   */
  toJSON() {
    return Object.assign({}, this.#data);
  }
  /**
   * All calculation and updates of position are implemented in {@link TJSPosition}. This allows position to be fully
   * reactive and in control of updating inline styles for a connected {@link HTMLElement}.
   *
   * The initial set call with a target element will always set width / height as this is necessary for correct
   * calculations.
   *
   * When a target element is present, updated styles are applied after validation. To modify the behavior of set,
   * implement one or more validator functions and add them via the validator API available from
   * {@link TJSPosition.validators}.
   *
   * Updates to any target element are decoupled from the underlying TJSPosition data. This method returns this
   * instance that you can then await on the target element inline style update by using
   * {@link TJSPosition.elementUpdated}.
   *
   * Relative updates to any property of {@link TJSPositionData} are possible by specifying properties as strings.
   * This string should be in the form of '+=', '-=', or '*=' and float / numeric value. IE '+=0.2'.
   * {@link TJSPosition.set} will apply the `addition`, `subtraction`, or `multiplication` operation specified against
   * the current value of the given property. Please see {@link Data.TJSPositionDataRelative} for a detailed
   * description.
   *
   * @param [position] - TJSPosition data to set.
   *
   * @param [options] - Additional options.
   *
   * @returns This TJSPosition instance.
   */
  set(position = {}, options = {}) {
    if (!isObject(position)) {
      throw new TypeError(`TJSPosition - set error: 'position' is not an object.`);
    }
    const parent = this.#parent;
    if (!this.#enabled) {
      return this;
    }
    if (parent !== void 0 && typeof parent?.options?.positionable === "boolean" && !parent?.options?.positionable) {
      return this;
    }
    const immediateElementUpdate = options?.immediateElementUpdate ?? false;
    const data = this.#data;
    const transforms = this.#transforms;
    const targetEl = A11yHelper.isFocusTarget(parent) ? parent : parent?.elementTarget;
    const el = A11yHelper.isFocusTarget(targetEl) && targetEl.isConnected ? targetEl : void 0;
    const changeSet = this.#positionChangeSet;
    const styleCache = this.#styleCache;
    if (el) {
      if (!styleCache.hasData(el)) {
        styleCache.update(el);
        if (!styleCache.hasWillChange) ;
        changeSet.set(true);
        this.#updateElementData.queued = false;
      }
      ConvertStringData.process(position, this.#data, el);
      position = this.#updatePosition(position, parent, el, styleCache);
      if (position === null) {
        return this;
      }
    }
    if (NumberGuard.isFinite(position.left)) {
      position.left = Math.round(position.left);
      if (data.left !== position.left) {
        data.left = position.left;
        changeSet.left = true;
      }
    }
    if (NumberGuard.isFinite(position.top)) {
      position.top = Math.round(position.top);
      if (data.top !== position.top) {
        data.top = position.top;
        changeSet.top = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.maxHeight)) {
      position.maxHeight = typeof position.maxHeight === "number" ? Math.round(position.maxHeight) : null;
      if (data.maxHeight !== position.maxHeight) {
        data.maxHeight = position.maxHeight;
        changeSet.maxHeight = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.maxWidth)) {
      position.maxWidth = typeof position.maxWidth === "number" ? Math.round(position.maxWidth) : null;
      if (data.maxWidth !== position.maxWidth) {
        data.maxWidth = position.maxWidth;
        changeSet.maxWidth = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.minHeight)) {
      position.minHeight = typeof position.minHeight === "number" ? Math.round(position.minHeight) : null;
      if (data.minHeight !== position.minHeight) {
        data.minHeight = position.minHeight;
        changeSet.minHeight = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.minWidth)) {
      position.minWidth = typeof position.minWidth === "number" ? Math.round(position.minWidth) : null;
      if (data.minWidth !== position.minWidth) {
        data.minWidth = position.minWidth;
        changeSet.minWidth = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.rotateX)) {
      if (data.rotateX !== position.rotateX) {
        data.rotateX = transforms.rotateX = position.rotateX;
        changeSet.transform = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.rotateY)) {
      if (data.rotateY !== position.rotateY) {
        data.rotateY = transforms.rotateY = position.rotateY;
        changeSet.transform = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.rotateZ)) {
      if (data.rotateZ !== position.rotateZ) {
        data.rotateZ = transforms.rotateZ = position.rotateZ;
        changeSet.transform = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.scale)) {
      position.scale = typeof position.scale === "number" ? clamp(position.scale, 0, 1e3) : null;
      if (data.scale !== position.scale) {
        data.scale = transforms.scale = position.scale;
        changeSet.transform = true;
      }
    }
    if (typeof position.transformOrigin === "string" && TJSTransforms.transformOrigins.includes(position.transformOrigin) || position.transformOrigin === null) {
      if (data.transformOrigin !== position.transformOrigin) {
        data.transformOrigin = position.transformOrigin;
        changeSet.transformOrigin = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.translateX)) {
      if (data.translateX !== position.translateX) {
        data.translateX = transforms.translateX = position.translateX;
        changeSet.transform = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.translateY)) {
      if (data.translateY !== position.translateY) {
        data.translateY = transforms.translateY = position.translateY;
        changeSet.transform = true;
      }
    }
    if (NumberGuard.isFiniteOrNull(position.translateZ)) {
      if (data.translateZ !== position.translateZ) {
        data.translateZ = transforms.translateZ = position.translateZ;
        changeSet.transform = true;
      }
    }
    if (NumberGuard.isFinite(position.zIndex)) {
      position.zIndex = Math.round(position.zIndex);
      if (data.zIndex !== position.zIndex) {
        data.zIndex = position.zIndex;
        changeSet.zIndex = true;
      }
    }
    const widthIsObservable = position.width === "auto" || position.width === "inherit";
    if (NumberGuard.isFiniteOrNull(position.width) || widthIsObservable) {
      position.width = typeof position.width === "number" ? Math.round(position.width) : position.width;
      if (data.width !== position.width) {
        data.width = position.width;
        changeSet.width = true;
      }
    }
    const heightIsObservable = position.height === "auto" || position.height === "inherit";
    if (NumberGuard.isFiniteOrNull(position.height) || heightIsObservable) {
      position.height = typeof position.height === "number" ? Math.round(position.height) : position.height;
      if (data.height !== position.height) {
        data.height = position.height;
        changeSet.height = true;
      }
    }
    const resizeObservable = widthIsObservable || heightIsObservable;
    if (this.#resizeObservable !== resizeObservable) {
      this.#resizeObservable = resizeObservable;
      this.#styleCache.stores.resizeObservable.set(resizeObservable);
    }
    if (el) {
      const defaultData = this.#state.getDefault();
      if (!isObject(defaultData)) {
        this.#state.save({ name: "#defaultData", ...Object.assign({}, data) });
      }
      if (immediateElementUpdate) {
        UpdateElementManager.immediate(el, this.#updateElementData);
        this.#updateElementPromise = Promise.resolve(globalThis.performance.now());
      } else if (!this.#updateElementData.queued) {
        this.#updateElementPromise = UpdateElementManager.add(el, this.#updateElementData);
      }
    } else {
      UpdateElementManager.updateSubscribers(this.#updateElementData);
    }
    return this;
  }
  /**
   * @param handler - Callback function that is invoked on update / changes. Receives a readonly copy of the
   *        TJSPositionData.
   *
   * @returns Unsubscribe function.
   */
  subscribe(handler) {
    const currentIdx = this.#subscribers.findIndex((entry) => entry === handler);
    if (currentIdx === -1) {
      this.#subscribers.push(handler);
      handler(Object.assign({}, this.#data));
    }
    return () => {
      const existingIdx = this.#subscribers.findIndex((entry) => entry === handler);
      if (existingIdx !== -1) {
        this.#subscribers.splice(existingIdx, 1);
      }
    };
  }
  /**
   * Provides the {@link Writable} store `update` method. Receive and return a {@link TJSPositionData} instance to
   * update the position state. You may manipulate numeric properties by providing relative adjustments described in
   * {@link TJSPositionDataRelative}.
   *
   * @param updater -
   */
  update(updater) {
    const result = updater(this.get());
    if (!isObject(result)) {
      throw new TypeError(`'result' of 'updater' is not an object.`);
    }
    this.set(result);
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Temporary data storage for `TJSPosition.#updatePosition`.
   */
  static #updateDataCopy = Object.seal(new TJSPositionData());
  /**
   * Temporary data storage for `TJSPosition.#updatePosition`.
   */
  static #validationData = Object.seal({
    position: void 0,
    parent: void 0,
    el: void 0,
    computed: void 0,
    transforms: void 0,
    height: void 0,
    width: void 0,
    marginLeft: void 0,
    marginTop: void 0,
    maxHeight: void 0,
    maxWidth: void 0,
    minHeight: void 0,
    minWidth: void 0,
    rest: void 0
  });
  /**
   * @param data -
   *
   * @param parent -
   *
   * @param el -
   *
   * @param styleCache -
   *
   * @returns Updated position data or null if validation fails.
   */
  #updatePosition({
    // Directly supported parameters
    left,
    top,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight,
    width,
    height,
    rotateX,
    rotateY,
    rotateZ,
    scale,
    transformOrigin,
    translateX,
    translateY,
    translateZ,
    zIndex,
    // Aliased parameters.
    rotation,
    ...rest
  }, parent, el, styleCache) {
    let currentPosition = TJSPositionDataUtil.copyData(this.#data, _a2.#updateDataCopy);
    if (width !== void 0 || el.style.width === "") {
      const widthValid = width === null || Number.isFinite(width);
      if (width === "auto" || currentPosition.width === "auto" && !widthValid) {
        currentPosition.width = "auto";
        width = styleCache.offsetWidth;
      } else if (width === "inherit" || currentPosition.width === "inherit" && !widthValid) {
        currentPosition.width = "inherit";
        width = styleCache.offsetWidth;
      } else {
        const newWidth = NumberGuard.isFinite(width) ? width : currentPosition.width;
        currentPosition.width = width = NumberGuard.isFinite(newWidth) ? Math.round(newWidth) : styleCache.offsetWidth;
      }
    } else {
      width = Number.isFinite(currentPosition.width) ? currentPosition.width : styleCache.offsetWidth;
    }
    if (height !== void 0 || el.style.height === "") {
      const heightValid = height === null || Number.isFinite(height);
      if (height === "auto" || currentPosition.height === "auto" && !heightValid) {
        currentPosition.height = "auto";
        height = styleCache.offsetHeight;
      } else if (height === "inherit" || currentPosition.height === "inherit" && !heightValid) {
        currentPosition.height = "inherit";
        height = styleCache.offsetHeight;
      } else {
        const newHeight = NumberGuard.isFinite(height) ? height : currentPosition.height;
        currentPosition.height = height = NumberGuard.isFinite(newHeight) ? Math.round(newHeight) : styleCache.offsetHeight;
      }
    } else {
      height = Number.isFinite(currentPosition.height) ? currentPosition.height : styleCache.offsetHeight;
    }
    if (NumberGuard.isFinite(left)) {
      currentPosition.left = left;
    } else if (!Number.isFinite(currentPosition.left)) {
      currentPosition.left = typeof this.#options?.initial?.getLeft === "function" ? this.#options.initial.getLeft(width) : 0;
    }
    if (Number.isFinite(top)) {
      currentPosition.top = top;
    } else if (!Number.isFinite(currentPosition.top)) {
      currentPosition.top = typeof this.#options?.initial?.getTop === "function" ? this.#options.initial.getTop(height) : 0;
    }
    if (NumberGuard.isFiniteOrNull(maxHeight)) {
      currentPosition.maxHeight = NumberGuard.isFinite(maxHeight) ? Math.round(maxHeight) : null;
    }
    if (NumberGuard.isFiniteOrNull(maxWidth)) {
      currentPosition.maxWidth = NumberGuard.isFinite(maxWidth) ? Math.round(maxWidth) : null;
    }
    if (NumberGuard.isFiniteOrNull(minHeight)) {
      currentPosition.minHeight = NumberGuard.isFinite(minHeight) ? Math.round(minHeight) : null;
    }
    if (NumberGuard.isFiniteOrNull(minWidth)) {
      currentPosition.minWidth = NumberGuard.isFinite(minWidth) ? Math.round(minWidth) : null;
    }
    if (NumberGuard.isFiniteOrNull(rotateX)) {
      currentPosition.rotateX = rotateX;
    }
    if (NumberGuard.isFiniteOrNull(rotateY)) {
      currentPosition.rotateY = rotateY;
    }
    if (rotateZ !== currentPosition.rotateZ && NumberGuard.isFiniteOrNull(rotateZ)) {
      currentPosition.rotateZ = rotateZ;
    } else if (rotation !== currentPosition.rotateZ && NumberGuard.isFiniteOrNull(rotation)) {
      currentPosition.rotateZ = rotation;
    }
    if (NumberGuard.isFiniteOrNull(translateX)) {
      currentPosition.translateX = translateX;
    }
    if (NumberGuard.isFiniteOrNull(translateY)) {
      currentPosition.translateY = translateY;
    }
    if (NumberGuard.isFiniteOrNull(translateZ)) {
      currentPosition.translateZ = translateZ;
    }
    if (NumberGuard.isFiniteOrNull(scale)) {
      currentPosition.scale = typeof scale === "number" ? clamp(scale, 0, 1e3) : null;
    }
    if (typeof transformOrigin === "string" || transformOrigin === null) {
      currentPosition.transformOrigin = TJSTransforms.transformOrigins.includes(transformOrigin) ? transformOrigin : null;
    }
    if (NumberGuard.isFiniteOrNull(zIndex)) {
      currentPosition.zIndex = typeof zIndex === "number" ? Math.round(zIndex) : zIndex;
    }
    const validatorData = this.#validatorData;
    if (this.#validators.enabled && validatorData.length) {
      const validationData = _a2.#validationData;
      validationData.parent = parent;
      validationData.el = el;
      validationData.computed = styleCache.computed;
      validationData.transforms = this.#transforms;
      validationData.height = height;
      validationData.width = width;
      validationData.marginLeft = styleCache.marginLeft;
      validationData.marginTop = styleCache.marginTop;
      validationData.maxHeight = styleCache.maxHeight ?? currentPosition.maxHeight;
      validationData.maxWidth = styleCache.maxWidth ?? currentPosition.maxWidth;
      const isMinimized = parent?.reactive?.minimized ?? false;
      validationData.minHeight = isMinimized ? currentPosition.minHeight ?? 0 : styleCache.minHeight || (currentPosition.minHeight ?? 0);
      validationData.minWidth = isMinimized ? currentPosition.minWidth ?? 0 : styleCache.minWidth || (currentPosition.minWidth ?? 0);
      for (let cntr = 0; cntr < validatorData.length; cntr++) {
        validationData.position = currentPosition;
        validationData.rest = rest;
        currentPosition = validatorData[cntr].validate(validationData);
        if (currentPosition === null) {
          return null;
        }
      }
    }
    return currentPosition;
  }
};
_a2 = TJSPosition;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/action/dom/style/index.js
function applyStyles(node, properties) {
  function setProperties() {
    if (!isObject(properties)) {
      return;
    }
    for (const prop of Object.keys(properties)) {
      node.style.setProperty(`${prop}`, properties[prop]);
    }
  }
  setProperties();
  return {
    /**
     * @param {{ [key: string]: string | null }}  newProperties - Key / value object of properties to set.
     */
    update: (newProperties) => {
      properties = newProperties;
      setProperties();
    }
  };
}

// node_modules/@typhonjs-fvtt/runtime/_dist/util/i18n/index.js
function localize(stringId, data) {
  const result = !isObject(data) ? globalThis.game.i18n.localize(stringId) : globalThis.game.i18n.format(stringId, data);
  return result !== void 0 ? result : "";
}

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/internal/dialog/DialogContent.svelte
var { Object: Object_1, console: console_1 } = globals;
var file = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/internal/dialog/DialogContent.svelte";
function add_css(target) {
  append_styles(target, "svelte-1kak6do", ".dialog-buttons.svelte-1kak6do{padding-top:8px}.tjs-dialog-button.svelte-1kak6do:hover{outline:var(--tjs-dialog-button-outline-focus-hover, var(--tjs-default-outline-focus-hover, revert))}.tjs-dialog-button.svelte-1kak6do:focus-visible{outline:var(--tjs-dialog-button-outline-focus-visible, var(--tjs-default-outline-focus-visible, revert))}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGlhbG9nQ29udGVudC5zdmVsdGUiLCJtYXBwaW5ncyI6IkFBa1lHLCtCQUNHLGVBQ0gsQ0FFQSx3Q0FDRyxvR0FDSCxDQUVBLGdEQUNHLHdHQUNIIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJEaWFsb2dDb250ZW50LnN2ZWx0ZSJdfQ== */");
}
function get_each_context(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[26] = list[i];
  return child_ctx;
}
function create_if_block_3(ctx) {
  let switch_instance;
  let switch_instance_anchor;
  let current;
  const switch_instance_spread_levels = [
    /*dialogProps*/
    ctx[7]
  ];
  var switch_value = (
    /*dialogClass*/
    ctx[6]
  );
  function switch_props(ctx2, dirty) {
    let switch_instance_props = {};
    for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
      switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    }
    if (dirty !== void 0 && dirty & /*dialogProps*/
    128) {
      switch_instance_props = assign(switch_instance_props, get_spread_update(switch_instance_spread_levels, [get_spread_object(
        /*dialogProps*/
        ctx2[7]
      )]));
    }
    return {
      props: switch_instance_props,
      $$inline: true
    };
  }
  if (switch_value) {
    switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
    ctx[16](switch_instance);
  }
  const block = {
    c: function create() {
      if (switch_instance) create_component(switch_instance.$$.fragment);
      switch_instance_anchor = empty();
    },
    m: function mount(target, anchor) {
      if (switch_instance) mount_component(switch_instance, target, anchor);
      insert_dev(target, switch_instance_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      if (dirty & /*dialogClass*/
      64 && switch_value !== (switch_value = /*dialogClass*/
      ctx2[6])) {
        if (switch_instance) {
          group_outros();
          const old_component = switch_instance;
          transition_out(old_component.$$.fragment, 1, 0, () => {
            destroy_component(old_component, 1);
          });
          check_outros();
        }
        if (switch_value) {
          switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx2, dirty));
          ctx2[16](switch_instance);
          create_component(switch_instance.$$.fragment);
          transition_in(switch_instance.$$.fragment, 1);
          mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
        } else {
          switch_instance = null;
        }
      } else if (switch_value) {
        const switch_instance_changes = dirty & /*dialogProps*/
        128 ? get_spread_update(switch_instance_spread_levels, [get_spread_object(
          /*dialogProps*/
          ctx2[7]
        )]) : {};
        switch_instance.$set(switch_instance_changes);
      }
    },
    i: function intro(local) {
      if (current) return;
      if (switch_instance) transition_in(switch_instance.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      if (switch_instance) transition_out(switch_instance.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(switch_instance_anchor);
      }
      ctx[16](null);
      if (switch_instance) destroy_component(switch_instance, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block_3.name,
    type: "if",
    source: "(366:28) ",
    ctx
  });
  return block;
}
function create_if_block_2(ctx) {
  let html_tag;
  let html_anchor;
  const block = {
    c: function create() {
      html_tag = new HtmlTag(false);
      html_anchor = empty();
      html_tag.a = html_anchor;
    },
    m: function mount(target, anchor) {
      html_tag.m(
        /*content*/
        ctx[3],
        target,
        anchor
      );
      insert_dev(target, html_anchor, anchor);
    },
    p: function update(ctx2, dirty) {
      if (dirty & /*content*/
      8) html_tag.p(
        /*content*/
        ctx2[3]
      );
    },
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(html_anchor);
        html_tag.d();
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block_2.name,
    type: "if",
    source: "(364:6) {#if typeof content === 'string'}",
    ctx
  });
  return block;
}
function create_if_block(ctx) {
  let div;
  let each_blocks = [];
  let each_1_lookup = /* @__PURE__ */ new Map();
  let each_value = ensure_array_like_dev(
    /*buttons*/
    ctx[1]
  );
  const get_key = (ctx2) => (
    /*button*/
    ctx2[26].id
  );
  validate_each_keys(ctx, each_value, get_each_context, get_key);
  for (let i = 0; i < each_value.length; i += 1) {
    let child_ctx = get_each_context(ctx, each_value, i);
    let key = get_key(child_ctx);
    each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
  }
  const block = {
    c: function create() {
      div = element("div");
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr_dev(div, "class", "dialog-buttons tjs-dialog-buttons svelte-1kak6do");
      add_location(div, file, 371, 3, 12840);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(div, null);
        }
      }
      ctx[20](div);
    },
    p: function update(ctx2, dirty) {
      if (dirty & /*buttons, onClick, currentButtonId*/
      530) {
        each_value = ensure_array_like_dev(
          /*buttons*/
          ctx2[1]
        );
        validate_each_keys(ctx2, each_value, get_each_context, get_key);
        each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx2, each_value, each_1_lookup, div, destroy_block, create_each_block, null, get_each_context);
      }
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].d();
      }
      ctx[20](null);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block.name,
    type: "if",
    source: "(371:3) {#if buttons.length}",
    ctx
  });
  return block;
}
function create_if_block_1(ctx) {
  let html_tag;
  let raw_value = (
    /*button*/
    ctx[26].icon + ""
  );
  let html_anchor;
  const block = {
    c: function create() {
      html_tag = new HtmlTag(false);
      html_anchor = empty();
      html_tag.a = html_anchor;
    },
    m: function mount(target, anchor) {
      html_tag.m(raw_value, target, anchor);
      insert_dev(target, html_anchor, anchor);
    },
    p: function update(ctx2, dirty) {
      if (dirty & /*buttons*/
      2 && raw_value !== (raw_value = /*button*/
      ctx2[26].icon + "")) html_tag.p(raw_value);
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(html_anchor);
        html_tag.d();
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block_1.name,
    type: "if",
    source: "(379:36) {#if button.icon}",
    ctx
  });
  return block;
}
function create_each_block(key_1, ctx) {
  let button_1;
  let span;
  let t0_value = (
    /*button*/
    ctx[26].label + ""
  );
  let t0;
  let span_title_value;
  let t1;
  let button_1_class_value;
  let button_1_disabled_value;
  let applyStyles_action;
  let mounted;
  let dispose;
  let if_block = (
    /*button*/
    ctx[26].icon && create_if_block_1(ctx)
  );
  function click_handler() {
    return (
      /*click_handler*/
      ctx[18](
        /*button*/
        ctx[26]
      )
    );
  }
  function focus_handler() {
    return (
      /*focus_handler*/
      ctx[19](
        /*button*/
        ctx[26]
      )
    );
  }
  const block = {
    key: key_1,
    first: null,
    c: function create() {
      button_1 = element("button");
      span = element("span");
      if (if_block) if_block.c();
      t0 = text(t0_value);
      t1 = space();
      attr_dev(span, "title", span_title_value = /*button*/
      ctx[26].title);
      add_location(span, file, 378, 9, 13261);
      attr_dev(button_1, "class", button_1_class_value = "dialog-button tjs-dialog-button " + /*button*/
      ctx[26].id + " svelte-1kak6do");
      button_1.disabled = button_1_disabled_value = /*button*/
      ctx[26].disabled;
      add_location(button_1, file, 373, 6, 12962);
      this.first = button_1;
    },
    m: function mount(target, anchor) {
      insert_dev(target, button_1, anchor);
      append_dev(button_1, span);
      if (if_block) if_block.m(span, null);
      append_dev(span, t0);
      append_dev(button_1, t1);
      if (!mounted) {
        dispose = [
          listen_dev(button_1, "click", stop_propagation(prevent_default(click_handler)), false, true, true, false),
          listen_dev(button_1, "focus", focus_handler, false, false, false, false),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            button_1,
            /*button*/
            ctx[26].styles
          ))
        ];
        mounted = true;
      }
    },
    p: function update(new_ctx, dirty) {
      ctx = new_ctx;
      if (
        /*button*/
        ctx[26].icon
      ) {
        if (if_block) {
          if_block.p(ctx, dirty);
        } else {
          if_block = create_if_block_1(ctx);
          if_block.c();
          if_block.m(span, t0);
        }
      } else if (if_block) {
        if_block.d(1);
        if_block = null;
      }
      if (dirty & /*buttons*/
      2 && t0_value !== (t0_value = /*button*/
      ctx[26].label + "")) set_data_dev(t0, t0_value);
      if (dirty & /*buttons*/
      2 && span_title_value !== (span_title_value = /*button*/
      ctx[26].title)) {
        attr_dev(span, "title", span_title_value);
      }
      if (dirty & /*buttons*/
      2 && button_1_class_value !== (button_1_class_value = "dialog-button tjs-dialog-button " + /*button*/
      ctx[26].id + " svelte-1kak6do")) {
        attr_dev(button_1, "class", button_1_class_value);
      }
      if (dirty & /*buttons*/
      2 && button_1_disabled_value !== (button_1_disabled_value = /*button*/
      ctx[26].disabled)) {
        prop_dev(button_1, "disabled", button_1_disabled_value);
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*buttons*/
      2) applyStyles_action.update.call(
        null,
        /*button*/
        ctx[26].styles
      );
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(button_1);
      }
      if (if_block) if_block.d();
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_each_block.name,
    type: "each",
    source: "(373:6) {#each buttons as button (button.id)}",
    ctx
  });
  return block;
}
function create_fragment(ctx) {
  let main;
  let div;
  let current_block_type_index;
  let if_block0;
  let t;
  let current;
  const if_block_creators = [create_if_block_2, create_if_block_3];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (typeof /*content*/
    ctx2[3] === "string") return 0;
    if (
      /*dialogClass*/
      ctx2[6]
    ) return 1;
    return -1;
  }
  if (~(current_block_type_index = select_block_type(ctx, -1))) {
    if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  }
  let if_block1 = (
    /*buttons*/
    ctx[1].length && create_if_block(ctx)
  );
  const block = {
    c: function create() {
      main = element("main");
      div = element("div");
      if (if_block0) if_block0.c();
      t = space();
      if (if_block1) if_block1.c();
      attr_dev(div, "class", "dialog-content");
      add_location(div, file, 362, 3, 12544);
      add_location(main, file, 361, 0, 12533);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, main, anchor);
      append_dev(main, div);
      if (~current_block_type_index) {
        if_blocks[current_block_type_index].m(div, null);
      }
      ctx[17](div);
      append_dev(main, t);
      if (if_block1) if_block1.m(main, null);
      current = true;
    },
    p: function update(ctx2, [dirty]) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2, dirty);
      if (current_block_type_index === previous_block_index) {
        if (~current_block_type_index) {
          if_blocks[current_block_type_index].p(ctx2, dirty);
        }
      } else {
        if (if_block0) {
          group_outros();
          transition_out(if_blocks[previous_block_index], 1, 1, () => {
            if_blocks[previous_block_index] = null;
          });
          check_outros();
        }
        if (~current_block_type_index) {
          if_block0 = if_blocks[current_block_type_index];
          if (!if_block0) {
            if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
            if_block0.c();
          } else {
            if_block0.p(ctx2, dirty);
          }
          transition_in(if_block0, 1);
          if_block0.m(div, null);
        } else {
          if_block0 = null;
        }
      }
      if (
        /*buttons*/
        ctx2[1].length
      ) {
        if (if_block1) {
          if_block1.p(ctx2, dirty);
        } else {
          if_block1 = create_if_block(ctx2);
          if_block1.c();
          if_block1.m(main, null);
        }
      } else if (if_block1) {
        if_block1.d(1);
        if_block1 = null;
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(if_block0);
      current = true;
    },
    o: function outro(local) {
      transition_out(if_block0);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(main);
      }
      if (~current_block_type_index) {
        if_blocks[current_block_type_index].d();
      }
      ctx[17](null);
      if (if_block1) if_block1.d();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
var s_REGEX_HTML = /^\s*<.*>$/;
function instance($$self, $$props, $$invalidate) {
  let autoClose;
  let focusFirst;
  let resolveId;
  let $elementRoot;
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("DialogContent", slots, []);
  let { data = void 0 } = $$props;
  let { preventDefault = false } = $$props;
  let { stopPropagation = false } = $$props;
  let { dialogComponent = void 0 } = $$props;
  const { elementRoot } = getContext("#internal").stores;
  validate_store(elementRoot, "elementRoot");
  component_subscribe($$self, elementRoot, (value) => $$invalidate(15, $elementRoot = value));
  const application = getContext("#external")?.application;
  const managedPromise = getContext("#managedPromise");
  let buttons;
  let contentEl;
  let buttonsEl;
  let content = void 0;
  let dialogClass;
  let dialogProps = {};
  let currentButtonId = data.default;
  onDestroy(() => {
    const rootEl = $elementRoot;
    if (A11yHelper.isFocusTarget(rootEl)) {
      rootEl.removeEventListener("keydown", onKeydown);
      rootEl.removeEventListener("keyup", onKeyup);
    }
  });
  onMount(() => {
    if (focusFirst) {
      const focusEl = A11yHelper.getFirstFocusableElement(contentEl);
      if (A11yHelper.isFocusTarget(focusEl)) {
        setTimeout(() => focusEl.focus(), 0);
      }
    }
  });
  function onClick(button) {
    try {
      let result = void 0;
      const callback = button?.onPress;
      switch (typeof callback) {
        case "function":
          result = callback({ application });
          break;
        case "string":
          if (dialogComponent !== void 0 && typeof dialogComponent[callback] === "function") {
            result = dialogComponent[callback]({ application });
          } else {
            if (dialogComponent === void 0) {
              console.warn(`[TRL] TJSDialog warning: 'onPress' defined as a string with no associated content Svelte component.`);
            } else if (typeof dialogComponent?.[callback] !== "function") {
              console.warn(`[TRL] TJSDialog warning: The content Svelte component does not contain an associated function '${callback}'. Did you remember to add '<svelte:options accessors={true} />' and export the function?`);
            }
          }
          break;
      }
      if (button.autoClose && autoClose) {
        if (resolveId && result === void 0) {
          result = button.id;
        }
        managedPromise.resolve(result);
      }
    } catch (err) {
      const notifyError = typeof data.notifyError === "boolean" ? data.notifyError : true;
      if (notifyError) {
        globalThis.ui.notifications.error(err, { console: false });
      }
      if (!managedPromise.reject(err)) {
        throw err;
      }
    } finally {
      if (button.autoClose && autoClose) {
        application.close();
      }
    }
  }
  function onKeydown(event) {
    switch (event.code) {
      case "ArrowLeft":
      case "ArrowRight":
      case "Enter":
        event.stopPropagation();
        break;
      case "Tab":
        event.stopPropagation();
        setTimeout(
          () => {
            const activeWindow = application.reactive.activeWindow;
            const activeElement = activeWindow.document.activeElement;
            if (A11yHelper.isFocusTarget(activeElement) && A11yHelper.isFocusTarget(buttonsEl) && buttonsEl.contains(activeElement)) {
              for (let cntr = 0; cntr < activeElement.classList.length; cntr++) {
                const item = activeElement.classList.item(cntr);
                if (item !== "dialog-button" && item !== "default" && typeof data.buttons[item] !== void 0) {
                  $$invalidate(4, currentButtonId = item);
                  break;
                }
              }
            }
          },
          0
        );
        break;
      default:
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        break;
    }
  }
  function onKeyup(event) {
    switch (event.code) {
      case "ArrowLeft": {
        event.preventDefault();
        event.stopPropagation();
        const activeWindow = application.reactive.activeWindow;
        const activeEl = activeWindow.document.activeElement;
        if (A11yHelper.isFocusTarget(buttonsEl)) {
          if (A11yHelper.isFocusTarget(activeEl) && buttonsEl.contains(activeEl)) {
            const currentIndex = buttons.findIndex((button) => button.id === currentButtonId);
            if (buttons.length && currentIndex > 0) {
              $$invalidate(4, currentButtonId = buttons[currentIndex - 1].id);
            }
          }
          const buttonEl = buttonsEl.querySelector(`.${currentButtonId}`);
          if (A11yHelper.isFocusTarget(buttonEl)) {
            buttonEl.focus();
          }
        }
        break;
      }
      case "ArrowRight": {
        event.preventDefault();
        event.stopPropagation();
        const activeWindow = application.reactive.activeWindow;
        const activeEl = activeWindow.document.activeElement;
        if (A11yHelper.isFocusTarget(buttonsEl)) {
          if (A11yHelper.isFocusTarget(activeEl) && (buttonsEl.contains(activeEl) || currentButtonId === void 0)) {
            const currentIndex = buttons.findIndex((button) => button.id === currentButtonId);
            if (buttons.length && currentIndex < buttons.length - 1) {
              $$invalidate(4, currentButtonId = buttons[currentIndex + 1].id);
            }
          }
          const buttonEl = buttonsEl.querySelector(`.${currentButtonId}`);
          if (A11yHelper.isFocusTarget(buttonEl)) {
            buttonEl.focus();
          }
        }
        break;
      }
      case "Enter":
        event.preventDefault();
        event.stopPropagation();
        break;
      default:
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
        break;
    }
  }
  const writable_props = ["data", "preventDefault", "stopPropagation", "dialogComponent"];
  Object_1.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console_1.warn(`<DialogContent> was created with unknown prop '${key}'`);
  });
  function switch_instance_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      dialogComponent = $$value;
      $$invalidate(0, dialogComponent);
    });
  }
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      contentEl = $$value;
      $$invalidate(5, contentEl);
    });
  }
  const click_handler = (button) => onClick(button);
  const focus_handler = (button) => $$invalidate(4, currentButtonId = button.id);
  function div_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      buttonsEl = $$value;
      $$invalidate(2, buttonsEl);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("data" in $$props2) $$invalidate(10, data = $$props2.data);
    if ("preventDefault" in $$props2) $$invalidate(11, preventDefault = $$props2.preventDefault);
    if ("stopPropagation" in $$props2) $$invalidate(12, stopPropagation = $$props2.stopPropagation);
    if ("dialogComponent" in $$props2) $$invalidate(0, dialogComponent = $$props2.dialogComponent);
  };
  $$self.$capture_state = () => ({
    getContext,
    onDestroy,
    onMount,
    applyStyles,
    TJSSvelte,
    A11yHelper,
    localize,
    isObject,
    data,
    preventDefault,
    stopPropagation,
    dialogComponent,
    s_REGEX_HTML,
    elementRoot,
    application,
    managedPromise,
    buttons,
    contentEl,
    buttonsEl,
    content,
    dialogClass,
    dialogProps,
    currentButtonId,
    onClick,
    onKeydown,
    onKeyup,
    autoClose,
    resolveId,
    focusFirst,
    $elementRoot
  });
  $$self.$inject_state = ($$props2) => {
    if ("data" in $$props2) $$invalidate(10, data = $$props2.data);
    if ("preventDefault" in $$props2) $$invalidate(11, preventDefault = $$props2.preventDefault);
    if ("stopPropagation" in $$props2) $$invalidate(12, stopPropagation = $$props2.stopPropagation);
    if ("dialogComponent" in $$props2) $$invalidate(0, dialogComponent = $$props2.dialogComponent);
    if ("buttons" in $$props2) $$invalidate(1, buttons = $$props2.buttons);
    if ("contentEl" in $$props2) $$invalidate(5, contentEl = $$props2.contentEl);
    if ("buttonsEl" in $$props2) $$invalidate(2, buttonsEl = $$props2.buttonsEl);
    if ("content" in $$props2) $$invalidate(3, content = $$props2.content);
    if ("dialogClass" in $$props2) $$invalidate(6, dialogClass = $$props2.dialogClass);
    if ("dialogProps" in $$props2) $$invalidate(7, dialogProps = $$props2.dialogProps);
    if ("currentButtonId" in $$props2) $$invalidate(4, currentButtonId = $$props2.currentButtonId);
    if ("autoClose" in $$props2) $$invalidate(13, autoClose = $$props2.autoClose);
    if ("resolveId" in $$props2) resolveId = $$props2.resolveId;
    if ("focusFirst" in $$props2) $$invalidate(14, focusFirst = $$props2.focusFirst);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*$elementRoot*/
    32768) {
      $: if ($elementRoot) {
        const rootEl = $elementRoot;
        if (A11yHelper.isFocusTarget(rootEl)) {
          rootEl.addEventListener("keydown", onKeydown);
          rootEl.addEventListener("keyup", onKeyup);
        }
      }
    }
    if ($$self.$$.dirty & /*data*/
    1024) {
      $: $$invalidate(13, autoClose = typeof data.autoClose === "boolean" ? data.autoClose : true);
    }
    if ($$self.$$.dirty & /*data*/
    1024) {
      $: $$invalidate(14, focusFirst = typeof data.focusFirst === "boolean" ? data.focusFirst : false);
    }
    if ($$self.$$.dirty & /*data*/
    1024) {
      $: {
        $$invalidate(1, buttons = !isObject(data.buttons) ? [] : Object.keys(data.buttons).reduce(
          (array, key) => {
            const b = data.buttons[key];
            const icon = typeof b.icon !== "string" ? void 0 : s_REGEX_HTML.test(b.icon) ? b.icon : `<i class="${b.icon}"></i>`;
            const autoClose2 = typeof b.autoClose === "boolean" ? b.autoClose : true;
            const disabled = typeof b.disabled === "boolean" ? b.disabled : false;
            const label = typeof b.label === "string" ? `${icon !== void 0 ? " " : ""}${localize(b.label)}` : "";
            const title = typeof b.title === "string" ? localize(b.title) : void 0;
            const condition = typeof b.condition === "function" ? b.condition.call(b) : b.condition ?? true;
            if (condition) {
              array.push({
                ...b,
                id: key,
                autoClose: autoClose2,
                icon,
                label,
                title,
                disabled
              });
            }
            return array;
          },
          []
        ));
      }
    }
    if ($$self.$$.dirty & /*buttons, currentButtonId*/
    18) {
      $: if (!buttons.find((button) => button.id === currentButtonId)) {
        $$invalidate(4, currentButtonId = void 0);
      }
    }
    if ($$self.$$.dirty & /*focusFirst, buttonsEl, currentButtonId*/
    16404) {
      $: if (!focusFirst && A11yHelper.isFocusTarget(buttonsEl)) {
        const buttonEl = buttonsEl.querySelector(`.${currentButtonId}`);
        if (A11yHelper.isFocusTarget(buttonEl)) {
          buttonEl.focus();
        }
      }
    }
    if ($$self.$$.dirty & /*data*/
    1024) {
      $: resolveId = typeof data.resolveId === "boolean" ? data.resolveId : false;
    }
    if ($$self.$$.dirty & /*content, data*/
    1032) {
      $: if (content !== data.content) {
        $$invalidate(
          3,
          content = data.content
        );
        try {
          if (TJSSvelte.config.isConfigEmbed(content)) {
            $$invalidate(6, dialogClass = content.class);
            $$invalidate(7, dialogProps = content.props);
          } else {
            $$invalidate(6, dialogClass = void 0);
            $$invalidate(7, dialogProps = {});
          }
        } catch (err) {
          $$invalidate(6, dialogClass = void 0);
          $$invalidate(7, dialogProps = {});
          $$invalidate(3, content = err.message);
          console.error(err);
        }
      }
    }
  };
  return [
    dialogComponent,
    buttons,
    buttonsEl,
    content,
    currentButtonId,
    contentEl,
    dialogClass,
    dialogProps,
    elementRoot,
    onClick,
    data,
    preventDefault,
    stopPropagation,
    autoClose,
    focusFirst,
    $elementRoot,
    switch_instance_binding,
    div_binding,
    click_handler,
    focus_handler,
    div_binding_1
  ];
}
var DialogContent = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(
      this,
      options,
      instance,
      create_fragment,
      safe_not_equal,
      {
        data: 10,
        preventDefault: 11,
        stopPropagation: 12,
        dialogComponent: 0
      },
      add_css
    );
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "DialogContent",
      options,
      id: create_fragment.name
    });
  }
  get data() {
    throw new Error("<DialogContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set data(value) {
    throw new Error("<DialogContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get preventDefault() {
    throw new Error("<DialogContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set preventDefault(value) {
    throw new Error("<DialogContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get stopPropagation() {
    throw new Error("<DialogContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set stopPropagation(value) {
    throw new Error("<DialogContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get dialogComponent() {
    throw new Error("<DialogContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set dialogComponent(value) {
    throw new Error("<DialogContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
};
var DialogContent_default = DialogContent;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/internal/dialog/DialogShell.svelte
function create_else_block(ctx) {
  let applicationshell;
  let updating_elementRoot;
  let updating_elementContent;
  let current;
  const applicationshell_spread_levels = [
    /*appProps*/
    ctx[6]
  ];
  function applicationshell_elementRoot_binding_1(value) {
    ctx[16](value);
  }
  function applicationshell_elementContent_binding_1(value) {
    ctx[17](value);
  }
  let applicationshell_props = {
    $$slots: { default: [create_default_slot_2] },
    $$scope: { ctx }
  };
  for (let i = 0; i < applicationshell_spread_levels.length; i += 1) {
    applicationshell_props = assign(applicationshell_props, applicationshell_spread_levels[i]);
  }
  if (
    /*elementRoot*/
    ctx[0] !== void 0
  ) {
    applicationshell_props.elementRoot = /*elementRoot*/
    ctx[0];
  }
  if (
    /*elementContent*/
    ctx[1] !== void 0
  ) {
    applicationshell_props.elementContent = /*elementContent*/
    ctx[1];
  }
  applicationshell = new ApplicationShell_default({
    props: applicationshell_props,
    $$inline: true
  });
  binding_callbacks.push(() => bind(applicationshell, "elementRoot", applicationshell_elementRoot_binding_1));
  binding_callbacks.push(() => bind(applicationshell, "elementContent", applicationshell_elementContent_binding_1));
  const block = {
    c: function create() {
      create_component(applicationshell.$$.fragment);
    },
    m: function mount(target, anchor) {
      mount_component(applicationshell, target, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      const applicationshell_changes = dirty & /*appProps*/
      64 ? get_spread_update(applicationshell_spread_levels, [get_spread_object(
        /*appProps*/
        ctx2[6]
      )]) : {};
      if (dirty & /*$$scope, data, dialogComponent*/
      8388620) {
        applicationshell_changes.$$scope = { dirty, ctx: ctx2 };
      }
      if (!updating_elementRoot && dirty & /*elementRoot*/
      1) {
        updating_elementRoot = true;
        applicationshell_changes.elementRoot = /*elementRoot*/
        ctx2[0];
        add_flush_callback(() => updating_elementRoot = false);
      }
      if (!updating_elementContent && dirty & /*elementContent*/
      2) {
        updating_elementContent = true;
        applicationshell_changes.elementContent = /*elementContent*/
        ctx2[1];
        add_flush_callback(() => updating_elementContent = false);
      }
      applicationshell.$set(applicationshell_changes);
    },
    i: function intro(local) {
      if (current) return;
      transition_in(applicationshell.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(applicationshell.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(applicationshell, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_else_block.name,
    type: "else",
    source: "(310:0) {:else}",
    ctx
  });
  return block;
}
function create_if_block2(ctx) {
  let tjsglasspane;
  let current;
  const tjsglasspane_spread_levels = [
    {
      id: `${/*application*/
      ctx[4].id}-glasspane`
    },
    /*modalProps*/
    ctx[7]
  ];
  let tjsglasspane_props = {
    $$slots: { default: [create_default_slot] },
    $$scope: { ctx }
  };
  for (let i = 0; i < tjsglasspane_spread_levels.length; i += 1) {
    tjsglasspane_props = assign(tjsglasspane_props, tjsglasspane_spread_levels[i]);
  }
  tjsglasspane = new TJSGlassPane_default({
    props: tjsglasspane_props,
    $$inline: true
  });
  tjsglasspane.$on(
    "glasspane:close",
    /*glasspane_close_handler*/
    ctx[13]
  );
  tjsglasspane.$on(
    "glasspane:keydown:escape",
    /*glasspane_keydown_escape_handler*/
    ctx[14]
  );
  const block = {
    c: function create() {
      create_component(tjsglasspane.$$.fragment);
    },
    m: function mount(target, anchor) {
      mount_component(tjsglasspane, target, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      const tjsglasspane_changes = dirty & /*application, modalProps*/
      144 ? get_spread_update(tjsglasspane_spread_levels, [
        dirty & /*application*/
        16 && {
          id: `${/*application*/
          ctx2[4].id}-glasspane`
        },
        dirty & /*modalProps*/
        128 && get_spread_object(
          /*modalProps*/
          ctx2[7]
        )
      ]) : {};
      if (dirty & /*$$scope, appProps, elementRoot, elementContent, data, dialogComponent*/
      8388687) {
        tjsglasspane_changes.$$scope = { dirty, ctx: ctx2 };
      }
      tjsglasspane.$set(tjsglasspane_changes);
    },
    i: function intro(local) {
      if (current) return;
      transition_in(tjsglasspane.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(tjsglasspane.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(tjsglasspane, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block2.name,
    type: "if",
    source: "(302:0) {#if modal}",
    ctx
  });
  return block;
}
function create_default_slot_2(ctx) {
  let dialogcontent;
  let updating_dialogComponent;
  let current;
  function dialogcontent_dialogComponent_binding_1(value) {
    ctx[15](value);
  }
  let dialogcontent_props = { data: (
    /*data*/
    ctx[3]
  ) };
  if (
    /*dialogComponent*/
    ctx[2] !== void 0
  ) {
    dialogcontent_props.dialogComponent = /*dialogComponent*/
    ctx[2];
  }
  dialogcontent = new DialogContent_default({
    props: dialogcontent_props,
    $$inline: true
  });
  binding_callbacks.push(() => bind(dialogcontent, "dialogComponent", dialogcontent_dialogComponent_binding_1));
  const block = {
    c: function create() {
      create_component(dialogcontent.$$.fragment);
    },
    m: function mount(target, anchor) {
      mount_component(dialogcontent, target, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      const dialogcontent_changes = {};
      if (dirty & /*data*/
      8) dialogcontent_changes.data = /*data*/
      ctx2[3];
      if (!updating_dialogComponent && dirty & /*dialogComponent*/
      4) {
        updating_dialogComponent = true;
        dialogcontent_changes.dialogComponent = /*dialogComponent*/
        ctx2[2];
        add_flush_callback(() => updating_dialogComponent = false);
      }
      dialogcontent.$set(dialogcontent_changes);
    },
    i: function intro(local) {
      if (current) return;
      transition_in(dialogcontent.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(dialogcontent.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(dialogcontent, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_default_slot_2.name,
    type: "slot",
    source: "(311:3) <ApplicationShell bind:elementRoot bind:elementContent {...appProps}>",
    ctx
  });
  return block;
}
function create_default_slot_1(ctx) {
  let dialogcontent;
  let updating_dialogComponent;
  let current;
  function dialogcontent_dialogComponent_binding(value) {
    ctx[10](value);
  }
  let dialogcontent_props = {
    data: (
      /*data*/
      ctx[3]
    ),
    stopPropagation: true
  };
  if (
    /*dialogComponent*/
    ctx[2] !== void 0
  ) {
    dialogcontent_props.dialogComponent = /*dialogComponent*/
    ctx[2];
  }
  dialogcontent = new DialogContent_default({
    props: dialogcontent_props,
    $$inline: true
  });
  binding_callbacks.push(() => bind(dialogcontent, "dialogComponent", dialogcontent_dialogComponent_binding));
  const block = {
    c: function create() {
      create_component(dialogcontent.$$.fragment);
    },
    m: function mount(target, anchor) {
      mount_component(dialogcontent, target, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      const dialogcontent_changes = {};
      if (dirty & /*data*/
      8) dialogcontent_changes.data = /*data*/
      ctx2[3];
      if (!updating_dialogComponent && dirty & /*dialogComponent*/
      4) {
        updating_dialogComponent = true;
        dialogcontent_changes.dialogComponent = /*dialogComponent*/
        ctx2[2];
        add_flush_callback(() => updating_dialogComponent = false);
      }
      dialogcontent.$set(dialogcontent_changes);
    },
    i: function intro(local) {
      if (current) return;
      transition_in(dialogcontent.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(dialogcontent.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(dialogcontent, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_default_slot_1.name,
    type: "slot",
    source: "(306:6) <ApplicationShell bind:elementRoot bind:elementContent {...appProps}>",
    ctx
  });
  return block;
}
function create_default_slot(ctx) {
  let applicationshell;
  let updating_elementRoot;
  let updating_elementContent;
  let current;
  const applicationshell_spread_levels = [
    /*appProps*/
    ctx[6]
  ];
  function applicationshell_elementRoot_binding(value) {
    ctx[11](value);
  }
  function applicationshell_elementContent_binding(value) {
    ctx[12](value);
  }
  let applicationshell_props = {
    $$slots: { default: [create_default_slot_1] },
    $$scope: { ctx }
  };
  for (let i = 0; i < applicationshell_spread_levels.length; i += 1) {
    applicationshell_props = assign(applicationshell_props, applicationshell_spread_levels[i]);
  }
  if (
    /*elementRoot*/
    ctx[0] !== void 0
  ) {
    applicationshell_props.elementRoot = /*elementRoot*/
    ctx[0];
  }
  if (
    /*elementContent*/
    ctx[1] !== void 0
  ) {
    applicationshell_props.elementContent = /*elementContent*/
    ctx[1];
  }
  applicationshell = new ApplicationShell_default({
    props: applicationshell_props,
    $$inline: true
  });
  binding_callbacks.push(() => bind(applicationshell, "elementRoot", applicationshell_elementRoot_binding));
  binding_callbacks.push(() => bind(applicationshell, "elementContent", applicationshell_elementContent_binding));
  const block = {
    c: function create() {
      create_component(applicationshell.$$.fragment);
    },
    m: function mount(target, anchor) {
      mount_component(applicationshell, target, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      const applicationshell_changes = dirty & /*appProps*/
      64 ? get_spread_update(applicationshell_spread_levels, [get_spread_object(
        /*appProps*/
        ctx2[6]
      )]) : {};
      if (dirty & /*$$scope, data, dialogComponent*/
      8388620) {
        applicationshell_changes.$$scope = { dirty, ctx: ctx2 };
      }
      if (!updating_elementRoot && dirty & /*elementRoot*/
      1) {
        updating_elementRoot = true;
        applicationshell_changes.elementRoot = /*elementRoot*/
        ctx2[0];
        add_flush_callback(() => updating_elementRoot = false);
      }
      if (!updating_elementContent && dirty & /*elementContent*/
      2) {
        updating_elementContent = true;
        applicationshell_changes.elementContent = /*elementContent*/
        ctx2[1];
        add_flush_callback(() => updating_elementContent = false);
      }
      applicationshell.$set(applicationshell_changes);
    },
    i: function intro(local) {
      if (current) return;
      transition_in(applicationshell.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(applicationshell.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      destroy_component(applicationshell, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_default_slot.name,
    type: "slot",
    source: "(303:3) <TJSGlassPane id={`${application.id}-glasspane`} {...modalProps}                   on:glasspane:close={() => application.close()}                   on:glasspane:keydown:escape={() => application.close()}>",
    ctx
  });
  return block;
}
function create_fragment2(ctx) {
  let current_block_type_index;
  let if_block;
  let if_block_anchor;
  let current;
  const if_block_creators = [create_if_block2, create_else_block];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*modal*/
      ctx2[5]
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx, -1);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  const block = {
    c: function create() {
      if_block.c();
      if_block_anchor = empty();
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      if_blocks[current_block_type_index].m(target, anchor);
      insert_dev(target, if_block_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, [dirty]) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2, dirty);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(if_block_anchor.parentNode, if_block_anchor);
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o: function outro(local) {
      transition_out(if_block);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(if_block_anchor);
      }
      if_blocks[current_block_type_index].d(detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment2.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
var s_MODAL_BACKGROUND = "#50505080";
function instance2($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("DialogShell", slots, []);
  let { elementContent = void 0 } = $$props;
  let { elementRoot = void 0 } = $$props;
  let { data = {} } = $$props;
  let { dialogComponent = void 0 } = $$props;
  let { managedPromise = void 0 } = $$props;
  const application = getContext("#external")?.application;
  const dialogOptions = writable({});
  setContext("#managedPromise", managedPromise);
  setContext("#dialogOptions", dialogOptions);
  const s_MODAL_TRANSITION = fade;
  const s_MODAL_TRANSITION_OPTIONS = { duration: 200 };
  let modal = void 0;
  const appProps = {
    // Stores any transition functions.
    transition: void 0,
    inTransition: void 0,
    outTransition: void 0,
    // Stores properties to set for options for any transitions.
    transitionOptions: void 0,
    inTransitionOptions: void 0,
    outTransitionOptions: void 0,
    // Stores any style overrides for application shell.
    stylesApp: void 0,
    stylesContent: void 0
  };
  const modalProps = {
    // Background CSS style string.
    background: void 0,
    slotSeparate: void 0,
    styles: void 0,
    // Close modal on glasspane input.
    closeOnInput: void 0,
    // Stores any transition functions.
    transition: void 0,
    inTransition: void 0,
    outTransition: void 0,
    // Stores properties to set for options for any transitions.
    transitionOptions: void 0,
    inTransitionOptions: void 0,
    outTransitionOptions: void 0
  };
  let zIndex = void 0;
  if (modal === void 0) {
    modal = typeof data?.modal === "boolean" ? data.modal : false;
  }
  const activeWindow = application.reactive.activeWindow;
  if (!modal) {
    onDestroy(() => activeWindow.document.removeEventListener("keydown", onKeydown));
    onMount(() => activeWindow.document.addEventListener("keydown", onKeydown));
  }
  function onKeydown(event) {
    if (event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      application.close();
    }
  }
  const writable_props = ["elementContent", "elementRoot", "data", "dialogComponent", "managedPromise"];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<DialogShell> was created with unknown prop '${key}'`);
  });
  function dialogcontent_dialogComponent_binding(value) {
    dialogComponent = value;
    $$invalidate(2, dialogComponent);
  }
  function applicationshell_elementRoot_binding(value) {
    elementRoot = value;
    $$invalidate(0, elementRoot);
  }
  function applicationshell_elementContent_binding(value) {
    elementContent = value;
    $$invalidate(1, elementContent);
  }
  const glasspane_close_handler = () => application.close();
  const glasspane_keydown_escape_handler = () => application.close();
  function dialogcontent_dialogComponent_binding_1(value) {
    dialogComponent = value;
    $$invalidate(2, dialogComponent);
  }
  function applicationshell_elementRoot_binding_1(value) {
    elementRoot = value;
    $$invalidate(0, elementRoot);
  }
  function applicationshell_elementContent_binding_1(value) {
    elementContent = value;
    $$invalidate(1, elementContent);
  }
  $$self.$$set = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(1, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(0, elementRoot = $$props2.elementRoot);
    if ("data" in $$props2) $$invalidate(3, data = $$props2.data);
    if ("dialogComponent" in $$props2) $$invalidate(2, dialogComponent = $$props2.dialogComponent);
    if ("managedPromise" in $$props2) $$invalidate(8, managedPromise = $$props2.managedPromise);
  };
  $$self.$capture_state = () => ({
    getContext,
    onDestroy,
    onMount,
    setContext,
    writable,
    fade,
    ApplicationShell: ApplicationShell_default,
    TJSGlassPane: TJSGlassPane_default,
    A11yHelper,
    isObject,
    DialogContent: DialogContent_default,
    elementContent,
    elementRoot,
    data,
    dialogComponent,
    managedPromise,
    application,
    dialogOptions,
    s_MODAL_TRANSITION,
    s_MODAL_TRANSITION_OPTIONS,
    s_MODAL_BACKGROUND,
    modal,
    appProps,
    modalProps,
    zIndex,
    activeWindow,
    onKeydown
  });
  $$self.$inject_state = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(1, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(0, elementRoot = $$props2.elementRoot);
    if ("data" in $$props2) $$invalidate(3, data = $$props2.data);
    if ("dialogComponent" in $$props2) $$invalidate(2, dialogComponent = $$props2.dialogComponent);
    if ("managedPromise" in $$props2) $$invalidate(8, managedPromise = $$props2.managedPromise);
    if ("modal" in $$props2) $$invalidate(5, modal = $$props2.modal);
    if ("zIndex" in $$props2) $$invalidate(9, zIndex = $$props2.zIndex);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*elementRoot, modal*/
    33) {
      $: if (A11yHelper.isFocusTarget(elementRoot)) {
        elementRoot.setAttribute("role", "dialog");
        if (modal) {
          elementRoot.setAttribute("aria-modal", "true");
        }
      }
    }
    if ($$self.$$.dirty & /*data, application, zIndex*/
    536) {
      $: if (isObject(data)) {
        dialogOptions.set(data);
        const newAlwaysOnTop = typeof data.alwaysOnTop === "boolean" ? data.alwaysOnTop : void 0;
        if (newAlwaysOnTop !== void 0 && application.reactive.alwaysOnTop !== newAlwaysOnTop) {
          $$invalidate(4, application.reactive.alwaysOnTop = newAlwaysOnTop, application);
        }
        const newDraggable = typeof data.draggable === "boolean" ? data.draggable : void 0;
        if (newDraggable !== void 0 && application.reactive.draggable !== newDraggable) {
          $$invalidate(4, application.reactive.draggable = newDraggable, application);
        }
        const newFocusAuto = typeof data.focusAuto === "boolean" ? data.focusAuto : void 0;
        if (newFocusAuto !== void 0 && application.reactive.focusAuto !== newFocusAuto) {
          $$invalidate(4, application.reactive.focusAuto = newFocusAuto, application);
        }
        const newFocusKeep = typeof data.focusKeep === "boolean" ? data.focusKeep : void 0;
        if (newFocusKeep !== void 0 && application.reactive.focusKeep !== newFocusKeep) {
          $$invalidate(4, application.reactive.focusKeep = newFocusKeep, application);
        }
        const newFocusTrap = typeof data.focusTrap === "boolean" ? data.focusTrap : void 0;
        if (newFocusTrap !== void 0 && application.reactive.focusTrap !== newFocusTrap) {
          $$invalidate(4, application.reactive.focusTrap = newFocusTrap, application);
        }
        const newMinimizable = typeof data.minimizable === "boolean" ? data.minimizable : void 0;
        if (newMinimizable !== void 0 && application.reactive.minimizable !== newMinimizable) {
          $$invalidate(4, application.reactive.minimizable = newMinimizable, application);
        }
        const newResizable = typeof data.resizable === "boolean" ? data.resizable : void 0;
        if (newResizable !== void 0 && application.reactive.resizable !== newResizable) {
          $$invalidate(4, application.reactive.resizable = newResizable, application);
        }
        const newTitle = data.title ?? "Dialog";
        if (newTitle !== application?.options?.title) {
          $$invalidate(4, application.reactive.title = newTitle, application);
        }
        const newZIndex = Number.isInteger(data.zIndex) || data.zIndex === null ? data.zIndex : void 0;
        if (zIndex !== newZIndex) {
          $$invalidate(9, zIndex = newZIndex);
        }
        if (application.position.zIndex !== zIndex) {
          $$invalidate(4, application.position.zIndex = zIndex, application);
        }
      }
    }
    if ($$self.$$.dirty & /*data, appProps*/
    72) {
      $: if (isObject(data?.transition)) {
        const d = data.transition;
        if (d?.transition !== appProps.transition) {
          $$invalidate(6, appProps.transition = d.transition, appProps);
        }
        if (d?.inTransition !== appProps.inTransition) {
          $$invalidate(6, appProps.inTransition = d.inTransition, appProps);
        }
        if (d?.outTransition !== appProps.outTransition) {
          $$invalidate(6, appProps.outTransition = d.outTransition, appProps);
        }
        if (d?.transitionOptions !== appProps.transitionOptions) {
          $$invalidate(6, appProps.transitionOptions = d.transitionOptions, appProps);
        }
        if (d?.inTransitionOptions !== appProps.inTransitionOptions) {
          $$invalidate(6, appProps.inTransitionOptions = d.inTransitionOptions, appProps);
        }
        if (d?.outTransitionOptions !== appProps.outTransitionOptions) {
          $$invalidate(6, appProps.outTransitionOptions = d.outTransitionOptions, appProps);
        }
      }
    }
    if ($$self.$$.dirty & /*data, modalProps*/
    136) {
      $: {
        const newModalBackground = typeof data?.modalOptions?.background === "string" ? data.modalOptions.background : s_MODAL_BACKGROUND;
        if (newModalBackground !== modalProps.background) {
          $$invalidate(7, modalProps.background = newModalBackground, modalProps);
        }
      }
    }
    if ($$self.$$.dirty & /*data, modalProps*/
    136) {
      $: {
        const newModalSlotSeparate = typeof data?.modalOptions?.slotSeparate === "boolean" ? data.modalOptions.slotSeparate : void 0;
        if (newModalSlotSeparate !== modalProps.slotSeparate) {
          $$invalidate(7, modalProps.slotSeparate = newModalSlotSeparate, modalProps);
        }
      }
    }
    if ($$self.$$.dirty & /*data, modalProps*/
    136) {
      $: {
        const newModalStyles = isObject(data?.modalOptions?.styles) ? data.modalOptions.styles : void 0;
        if (newModalStyles !== modalProps.styles) {
          $$invalidate(7, modalProps.styles = newModalStyles, modalProps);
        }
      }
    }
    if ($$self.$$.dirty & /*data, modalProps*/
    136) {
      $: {
        const newModalCloseOnInput = typeof data?.modalOptions?.closeOnInput === "boolean" ? data.modalOptions.closeOnInput : void 0;
        if (newModalCloseOnInput !== modalProps.closeOnInput) {
          $$invalidate(7, modalProps.closeOnInput = newModalCloseOnInput, modalProps);
        }
      }
    }
    if ($$self.$$.dirty & /*data, modalProps*/
    136) {
      $: if (isObject(data?.modalOptions?.transition)) {
        const d = data.modalOptions.transition;
        if (d?.transition !== modalProps.transition) {
          $$invalidate(
            7,
            modalProps.transition = typeof d?.transition === "function" ? d.transition : s_MODAL_TRANSITION,
            modalProps
          );
        }
        if (d?.inTransition !== modalProps.inTransition) {
          $$invalidate(7, modalProps.inTransition = d.inTransition, modalProps);
        }
        if (d?.outTransition !== modalProps.outTransition) {
          $$invalidate(7, modalProps.outTransition = d.outTransition, modalProps);
        }
        if (d?.transitionOptions !== modalProps.transitionOptions) {
          $$invalidate(
            7,
            modalProps.transitionOptions = isObject(d?.transitionOptions) ? d.transitionOptions : s_MODAL_TRANSITION_OPTIONS,
            modalProps
          );
        }
        if (d?.inTransitionOptions !== modalProps.inTransitionOptions) {
          $$invalidate(7, modalProps.inTransitionOptions = d.inTransitionOptions, modalProps);
        }
        if (d?.outTransitionOptions !== modalProps.outTransitionOptions) {
          $$invalidate(7, modalProps.outTransitionOptions = d.outTransitionOptions, modalProps);
        }
      } else {
        const newModalTransition = typeof data?.modalOptions?.transition?.transition === "function" ? data.modalOptions.transition.transition : s_MODAL_TRANSITION;
        if (newModalTransition !== modalProps.transition) {
          $$invalidate(7, modalProps.transition = newModalTransition, modalProps);
        }
        const newModalTransitionOptions = isObject(data?.modalOptions?.transitionOptions) ? data.modalOptions.transitionOptions : s_MODAL_TRANSITION_OPTIONS;
        if (newModalTransitionOptions !== modalProps.transitionOptions) {
          $$invalidate(7, modalProps.transitionOptions = newModalTransitionOptions, modalProps);
        }
      }
    }
  };
  return [
    elementRoot,
    elementContent,
    dialogComponent,
    data,
    application,
    modal,
    appProps,
    modalProps,
    managedPromise,
    zIndex,
    dialogcontent_dialogComponent_binding,
    applicationshell_elementRoot_binding,
    applicationshell_elementContent_binding,
    glasspane_close_handler,
    glasspane_keydown_escape_handler,
    dialogcontent_dialogComponent_binding_1,
    applicationshell_elementRoot_binding_1,
    applicationshell_elementContent_binding_1
  ];
}
var DialogShell = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance2, create_fragment2, safe_not_equal, {
      elementContent: 1,
      elementRoot: 0,
      data: 3,
      dialogComponent: 2,
      managedPromise: 8
    });
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "DialogShell",
      options,
      id: create_fragment2.name
    });
  }
  get elementContent() {
    return this.$$.ctx[1];
  }
  set elementContent(elementContent) {
    this.$$set({ elementContent });
    flush();
  }
  get elementRoot() {
    return this.$$.ctx[0];
  }
  set elementRoot(elementRoot) {
    this.$$set({ elementRoot });
    flush();
  }
  get data() {
    return this.$$.ctx[3];
  }
  set data(data) {
    this.$$set({ data });
    flush();
  }
  get dialogComponent() {
    return this.$$.ctx[2];
  }
  set dialogComponent(dialogComponent) {
    this.$$set({ dialogComponent });
    flush();
  }
  get managedPromise() {
    return this.$$.ctx[8];
  }
  set managedPromise(managedPromise) {
    this.$$set({ managedPromise });
    flush();
  }
};
var DialogShell_default = DialogShell;

// node_modules/@typhonjs-fvtt/runtime/_dist/util/async/index.js
var ManagedPromise = class _ManagedPromise {
  /** @type {boolean} */
  static #logging = false;
  /** @type {{ isProcessing?: boolean, promise?: Promise, reject: Function, resolve: Function }} */
  #current;
  /**
   * @returns {boolean} Whether global logging is enabled.
   */
  static get logging() {
    return this.#logging;
  }
  /**
   * @returns {boolean} Whether there is an active managed Promise.
   */
  get isActive() {
    return this.#current !== void 0;
  }
  /**
   * @returns {boolean} Whether there is an active managed Promise and resolution is currently being processed.
   */
  get isProcessing() {
    return this.#current !== void 0 ? this.#current.isProcessing : false;
  }
  /**
   * Sets global logging enabled state.
   *
   * @param {boolean}  logging - New logging enabled state.
   */
  static set logging(logging) {
    if (typeof logging !== "boolean") {
      throw new TypeError(`[TRL] ManagedPromise.logging error: 'logging' is not a boolean.`);
    }
    this.#logging = logging;
  }
  // ----------------------------------------------------------------------------------------------------------------
  /**
   * Resolves any current Promise with undefined and creates a new current Promise.
   *
   * @template T
   *
   * @param {object} opts - Options.
   *
   * @param {boolean}  [opts.reuse=false] - When true if there is an existing live Promise it is returned immediately.
   *
   * @returns {Promise<T>} The new current managed Promise.
   */
  create({ reuse = false } = {}) {
    if (typeof reuse !== "boolean") {
      throw new TypeError(`[TRL] ManagedPromise.create error: 'reuse' is not a boolean.`);
    }
    if (reuse && this.#current !== void 0 && CrossWindow.isPromise(this.#current.promise)) {
      if (_ManagedPromise.#logging) {
        console.warn(`[TRL] ManagedPromise.create info: Reusing / returning existing managed Promise.`);
      }
      return this.#current.promise;
    }
    if (this.#current !== void 0) {
      if (_ManagedPromise.#logging) {
        console.warn(
          `[TRL] ManagedPromise.create info: Creating a new Promise and resolving existing immediately.`
        );
      }
      this.#current.resolve(void 0);
      this.#current = void 0;
    }
    const promise = new Promise((resolve, reject) => {
      this.#current = {
        isProcessing: false,
        reject,
        resolve
      };
    });
    this.#current.promise = promise;
    return promise;
  }
  /**
   * Gets the current Promise if any.
   *
   * @returns {Promise<any>} Current Promise.
   */
  get() {
    return this.#current ? this.#current.promise : void 0;
  }
  /**
   * Rejects the current Promise if applicable.
   *
   * @param {*}  [result] - Result to reject.
   *
   * @returns {boolean} Was the promise rejected.
   */
  reject(result = void 0) {
    if (this.#current !== void 0 && this.#current.isProcessing) {
      if (_ManagedPromise.#logging) {
        console.warn(`[TRL] ManagedPromise.reject info: Currently processing promise.`);
      }
      return true;
    }
    if (this.#current !== void 0) {
      this.#current.isProcessing = true;
      if (CrossWindow.isPromise(result)) {
        result.then((value) => {
          this.#current.reject(value);
          this.#current = void 0;
        }).catch((err) => {
          this.#current.reject(err);
          this.#current = void 0;
        });
      } else {
        this.#current.reject(result);
        this.#current = void 0;
      }
      return true;
    } else {
      if (_ManagedPromise.#logging) {
        console.warn(`[TRL] ManagedPromise.reject warning: No current managed Promise to reject.`);
      }
      return false;
    }
  }
  /**
   * Resolves the current Promise if applicable.
   *
   * @param {*}  [result] - Result to resolve.
   *
   * @returns {boolean} Was the promise resolved.
   */
  resolve(result = void 0) {
    if (this.#current !== void 0 && this.#current.isProcessing) {
      if (_ManagedPromise.#logging) {
        console.warn(`[TRL] ManagedPromise.resolve info: Currently processing promise.`);
      }
      return true;
    }
    if (this.#current !== void 0) {
      if (CrossWindow.isPromise(result)) {
        this.#current.isProcessing = true;
        result.then((value) => {
          this.#current.resolve(value);
          this.#current = void 0;
        }).catch((err) => {
          this.#current.reject(err);
          this.#current = void 0;
        });
      } else {
        this.#current.resolve(result);
        this.#current = void 0;
      }
      return true;
    } else {
      if (_ManagedPromise.#logging) {
        console.warn(`[TRL] ManagedPromise.resolve warning: No current managed Promise to resolve.`);
      }
      return false;
    }
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/application/index.js
var ApplicationState = class {
  /** @type {import('../../SvelteApp.js').SvelteApp} */
  #application;
  /**
   * Stores the current save state key being restored by animating. When a restore is already being animated with the
   * same name the subsequent restore animation is ignored.
   *
   * @type {string | undefined}
   */
  #currentRestoreKey;
  /** @type {Map<string, import('../../types').SvelteApp.API.State.Data>} */
  #dataSaved = /* @__PURE__ */ new Map();
  /**
   * @param {import('../../SvelteApp.js').SvelteApp}   application - The application.
   */
  constructor(application) {
    this.#application = application;
    Object.seal(this);
  }
  /**
   * Clears all saved application state.
   */
  clear() {
    this.#dataSaved.clear();
  }
  /**
   * Returns current application state along with any extra data passed into method.
   *
   * @param {object} [extra] - Extra data to add to application state.
   *
   * @returns {import('../../types').SvelteApp.API.State.Data} Passed in object with current application state.
   */
  current(extra = {}) {
    return Object.assign(extra, {
      position: this.#application?.position?.get(),
      beforeMinimized: this.#application?.position?.state.get({ name: "#beforeMinimized" }),
      options: this.#application?.reactive?.toJSON(),
      ui: { minimized: this.#application?.reactive?.minimized }
    });
  }
  /**
   * Gets any saved application state by name.
   *
   * @param {object}   options - Options.
   *
   * @param {string}   options.name - Saved data set name.
   *
   * @returns {import('../../types').SvelteApp.API.State.Data | undefined} Any saved application state.
   */
  get({ name }) {
    if (typeof name !== "string") {
      throw new TypeError(`[SvelteApp.state.get] error: 'name' is not a string.`);
    }
    return this.#dataSaved.get(name);
  }
  /**
   * @returns {IterableIterator<string>} The saved application state names / keys.
   */
  keys() {
    return this.#dataSaved.keys();
  }
  /**
   * Removes and returns any saved application state by name.
   *
   * @param {object}   options - Options.
   *
   * @param {string}   options.name - Name to remove and retrieve.
   *
   * @returns {import('../../types').SvelteApp.API.State.Data | undefined} Any saved application state.
   */
  remove({ name }) {
    if (typeof name !== "string") {
      throw new TypeError(`[SvelteApp.state.remove] error: 'name' is not a string.`);
    }
    const data = this.#dataSaved.get(name);
    this.#dataSaved.delete(name);
    return data;
  }
  /**
   * Restores a previously saved application state by `name` returning the data. Several optional parameters are
   * available to animate / tween to the new state. When `animateTo` is true an animation is scheduled via
   * {@link #runtime/svelte/store/position!TJSPosition.API.Animation.to} and the duration and easing name or function may be
   * specified.
   *
   * @param {object}            options - Options.
   *
   * @param {string}            options.name - Saved data set name.
   *
   * @param {boolean}           [options.remove=false] - Remove data set.
   *
   * @param {boolean}           [options.animateTo=false] - Animate to restore data.
   *
   * @param {boolean}           [options.cancelable=true] - When true, animation is cancelable.
   *
   * @param {number}            [options.duration=0.1] - Duration in seconds.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/easing').EasingReference} [options.ease='linear'] - Easing function or easing
   *        function name.
   *
   * @returns {import('../../types').SvelteApp.API.State.Data | undefined} Any saved application state.
   */
  restore({ name, remove = false, animateTo = false, cancelable = true, duration = 0.1, ease = "linear" }) {
    if (typeof name !== "string") {
      throw new TypeError(`[SvelteApp.state.restore] error: 'name' is not a string.`);
    }
    const dataSaved = this.#dataSaved.get(name);
    if (dataSaved) {
      if (remove) {
        this.#dataSaved.delete(name);
      }
      if (animateTo && name !== this.#currentRestoreKey) {
        this.#currentRestoreKey = name;
        this.#setImpl(dataSaved, {
          animateTo,
          async: true,
          cancelable,
          duration,
          ease
        }).then(() => {
          if (name === this.#currentRestoreKey) {
            this.#currentRestoreKey = void 0;
          }
        });
      }
    }
    return dataSaved;
  }
  /**
   * Saves current application state with the opportunity to add extra data to the saved state.
   *
   * @param {object}   options - Options.
   *
   * @param {string}   options.name - Name to index this saved state.
   *
   * @returns {import('../../types').SvelteApp.API.State.Data} Current saved application state.
   */
  save({ name, ...extra }) {
    if (typeof name !== "string") {
      throw new TypeError(`[SvelteApp.state.save] error: 'name' is not a string.`);
    }
    const data = this.current(extra);
    this.#dataSaved.set(name, data);
    return data;
  }
  /**
   * Sets application state from the given `SvelteApp.API.State.Data` instance. Several optional parameters are
   * available to animate / tween to the new state. When `animateTo` is true an animation is scheduled via
   * {@link #runtime/svelte/store/position!AnimationAPI.to} and the duration and easing name or function may be
   * specified.
   *
   * Note: If serializing application state any minimized apps will use the before minimized state on initial render
   * of the app as it is currently not possible to render apps with Foundry VTT core API in the minimized state.
   *
   * @param {import('../../types').SvelteApp.API.State.Data}   data - Saved data set name.
   *
   * @param {object}         [options] - Optional parameters
   *
   * @param {boolean}        [options.animateTo=false] - Animate to restore data.
   *
   * @param {boolean}        [options.cancelable=true] - When true, animation is cancelable.
   *
   * @param {number}         [options.duration=0.1] - Duration in seconds.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/easing').EasingReference} [options.ease='linear'] - Easing function or easing
   *        function name.
   */
  set(data, options = {}) {
    this.#setImpl(data, { ...options, async: false });
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Sets application state from the given `SvelteApp.API.State.Data` instance. Several optional parameters are
   * available to animate / tween to the new state. When `animateTo` is true an animation is scheduled via
   * {@link #runtime/svelte/store/position!AnimationAPI.to} and the duration and easing name or function may be
   * specified.
   *
   * Note: If serializing application state any minimized apps will use the before minimized state on initial render
   * of the app as it is currently not possible to render apps with Foundry VTT core API in the minimized state.
   *
   * @privateRemarks
   * TODO: THIS METHOD NEEDS TO BE REFACTORED WHEN TRL IS MADE INTO A STANDALONE FRAMEWORK.
   *
   * @param {import('../../types').SvelteApp.API.State.Data}   data - Saved data set name.
   *
   * @param {object}            [opts] - Optional parameters
   *
   * @param {boolean}           [opts.async=false] - If animating return a Promise that resolves with any saved data.
   *
   * @param {boolean}           [opts.animateTo=false] - Animate to restore data.
   *
   * @param {boolean}           [opts.cancelable=true] - When true, animation is cancelable.
   *
   * @param {number}            [opts.duration=0.1] - Duration in seconds.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/easing').EasingReference} [opts.ease='linear'] - Easing function or easing
   *        function name.
   *
   * @returns {undefined | Promise<void>} When asynchronous the animation Promise.
   */
  #setImpl(data, { async = false, animateTo = false, cancelable = true, duration = 0.1, ease = "linear" } = {}) {
    if (!isObject(data)) {
      throw new TypeError(`[SvelteApp.state.set] error: 'data' is not an object.`);
    }
    const application = this.#application;
    if (!isObject(data?.position)) {
      console.warn(`[SvelteApp.state.set] warning: 'data.position' is not an object.`);
      return;
    }
    const rendered = application.rendered;
    if (animateTo) {
      if (!rendered) {
        console.warn(`[SvelteApp.state.set] warning: application is not rendered and 'animateTo' is true.`);
        return;
      }
      if (data.position.transformOrigin !== application.position.transformOrigin) {
        application.position.transformOrigin = data.position.transformOrigin;
      }
      if (isObject(data?.ui)) {
        const minimized = typeof data.ui?.minimized === "boolean" ? data.ui.minimized : false;
        if (application?.reactive?.minimized && !minimized) {
          application.maximize({ animate: false, duration: 0 });
        }
      }
      const promise = application.position.animate.to(data.position, {
        cancelable,
        duration,
        ease,
        strategy: "cancelAll"
      }).finished.then(({ cancelled }) => {
        if (cancelled) {
          return;
        }
        if (isObject(data?.options)) {
          application?.reactive.mergeOptions(data.options);
        }
        if (isObject(data?.ui)) {
          const minimized = typeof data.ui?.minimized === "boolean" ? data.ui.minimized : false;
          if (!application?.reactive?.minimized && minimized) {
            application.minimize({ animate: false, duration: 0 });
          }
        }
        if (isObject(data?.beforeMinimized)) {
          application.position.state.set({ name: "#beforeMinimized", ...data.beforeMinimized });
        }
      });
      if (async) {
        return promise;
      }
    } else {
      if (isObject(data?.options)) {
        application?.reactive.mergeOptions(data.options);
      }
      if (rendered) {
        if (isObject(data?.ui)) {
          const minimized = typeof data.ui?.minimized === "boolean" ? data.ui.minimized : false;
          if (application?.reactive?.minimized && !minimized) {
            application.maximize({ animate: false, duration: 0 });
          } else if (!application?.reactive?.minimized && minimized) {
            application.minimize({ animate: false, duration });
          }
        }
        if (isObject(data?.beforeMinimized)) {
          application.position.state.set({ name: "#beforeMinimized", ...data.beforeMinimized });
        }
        application.position.set(data.position);
      } else {
        let positionData = data.position;
        if (isObject(data.beforeMinimized)) {
          positionData = data.beforeMinimized;
          positionData.left = data.position.left;
          positionData.top = data.position.top;
        }
        application.position.set(positionData);
      }
    }
  }
};
var GetSvelteData = class {
  /** @type {import('svelte').SvelteComponent[] | null[]} */
  #applicationShellHolder;
  /** @type {import('./types').SvelteData[]} */
  #svelteData;
  /**
   * Keep a direct reference to the SvelteData array in an associated {@link SvelteApp}.
   *
   * @param {import('svelte').SvelteComponent[] | null[]}  applicationShellHolder - A reference to the mounted app shell.
   *
   * @param {import('./types').SvelteData[]}  svelteData - A reference to the SvelteData array of mounted components.
   */
  constructor(applicationShellHolder, svelteData) {
    this.#applicationShellHolder = applicationShellHolder;
    this.#svelteData = svelteData;
  }
  /**
   * Returns any mounted application shell.
   *
   * @returns {import('svelte').SvelteComponent} Any mounted application shell.
   */
  get appShell() {
    return this.#applicationShellHolder[0];
  }
  /**
   * Returns any mounted application shell.
   *
   * @deprecated Use {@link GetSvelteData.appShell}; since `0.2.0` removal in `0.5.0`.
   *
   * @returns {import('svelte').SvelteComponent} Any mounted application shell.
   */
  get applicationShell() {
    return this.#applicationShellHolder[0];
  }
  /**
   * Returns mounted application shell data / config.
   *
   * @internal
   *
   * @returns {import('./types').SvelteData} Any mounted application shell data.
   */
  get appShellData() {
    return this.#svelteData[0];
  }
};
function handleAlwaysOnTop(application, enabled) {
  if (typeof enabled !== "boolean") {
    throw new TypeError(`[SvelteApp handleAlwaysOnTop error]: 'enabled' is not a boolean.`);
  }
  const version = globalThis?.TRL_SVELTE_APP_DATA?.VERSION;
  if (typeof version !== "number") {
    console.error("[SvelteApp handleAlwaysOnTop error]: global SvelteApp data unavailable.");
    return;
  }
  if (enabled) {
    globalThis.requestAnimationFrame(() => {
      application.reactive.popOut = false;
      globalThis.requestAnimationFrame(() => application.bringToTop({ force: true }));
    });
  } else {
    globalThis.requestAnimationFrame(() => {
      application.position.zIndex = foundry.applications.api.ApplicationV2._maxZ - 1;
      application.reactive.popOut = true;
      globalThis.requestAnimationFrame(() => application.bringToTop({ force: true }));
    });
  }
}
var applicationShellContract = ["elementRoot"];
Object.freeze(applicationShellContract);
function isApplicationShell(component) {
  if (component === null || component === void 0) {
    return false;
  }
  let compHasContract = true;
  let protoHasContract = true;
  for (const accessor of applicationShellContract) {
    const descriptor = Object.getOwnPropertyDescriptor(component, accessor);
    if (descriptor === void 0 || descriptor.get === void 0 || descriptor.set === void 0) {
      compHasContract = false;
    }
  }
  const prototype = Object.getPrototypeOf(component);
  for (const accessor of applicationShellContract) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, accessor);
    if (descriptor === void 0 || descriptor.get === void 0 || descriptor.set === void 0) {
      protoHasContract = false;
    }
  }
  return compHasContract || protoHasContract;
}
function loadSvelteConfig({ app, config, elementRootUpdate } = {}) {
  let target;
  if (CrossWindow.isHTMLElement(config.target)) {
    target = config.target;
  } else if (typeof config.target === "string") {
    const activeWindow = app?.reactive?.activeWindow;
    target = activeWindow?.document?.querySelector(config.target);
  }
  if (!CrossWindow.isHTMLElement(target)) {
    console.log(
      `%c[TRL] loadSvelteConfig error - Could not find target, '${config.target}', for config:
`,
      "background: rgb(57,34,34)",
      config
    );
    throw new Error();
  }
  const NewSvelteComponent = config.class;
  const svelteConfig = TJSSvelte.config.parseConfig({ ...config, target }, { contextExternal: true, thisArg: app });
  const externalContext = svelteConfig.context.get("#external");
  externalContext.application = app;
  externalContext.elementRootUpdate = elementRootUpdate;
  externalContext.sessionStorage = app.reactive.sessionStorage;
  let eventbus;
  if (isObject(app._eventbus) && typeof app._eventbus.createProxy === "function") {
    eventbus = app._eventbus.createProxy();
    externalContext.eventbus = eventbus;
  }
  Object.seal(externalContext);
  const component = new NewSvelteComponent(svelteConfig);
  svelteConfig.eventbus = eventbus;
  let element2;
  if (isApplicationShell(component)) {
    element2 = component.elementRoot;
  }
  if (!CrossWindow.isHTMLElement(element2)) {
    console.log(
      `%c[TRL] loadSvelteConfig error - No application shell contract found. Did you bind and export a HTMLElement as 'elementRoot' and include '<svelte:options accessors={true}/>'?

Offending config:
`,
      "background: rgb(57,34,34)",
      config
    );
    throw new Error();
  }
  return { config: svelteConfig, component, element: element2 };
}
var SvelteReactive = class {
  /**
   * @type {import('../SvelteApp').SvelteApp}
   */
  #application;
  /**
   * @type {boolean}
   */
  #initialized = false;
  /** @type {import('@typhonjs-fvtt/runtime/svelte/store/web-storage').WebStorage} */
  #sessionStorage;
  /**
   * The Application option store which is injected into mounted Svelte component context under the `external` key.
   *
   * @type {import('../../types').SvelteApp.API.Reactive.AppOptions}
   */
  #storeAppOptions;
  /**
   * Stores the update function for `#storeAppOptions`.
   *
   * @type {(this: void, updater: import('svelte/store').Updater<object>) => void}
   */
  #storeAppOptionsUpdate;
  /**
   * Stores the UI state data to make it accessible via getters.
   *
   * @type {object}
   */
  #dataUIState;
  /**
   * The UI option store which is injected into mounted Svelte component context under the `external` key.
   *
   * @type {import('../../types').SvelteApp.API.Reactive.UIState}
   */
  #storeUIState;
  /**
   * Stores the update function for `#storeUIState`.
   *
   * @type {(this: void, updater: import('svelte/store').Updater<object>) => void}
   */
  #storeUIStateUpdate;
  /**
   * Stores the unsubscribe functions from local store subscriptions.
   *
   * @type {import('svelte/store').Unsubscriber[]}
   */
  #storeUnsubscribe = [];
  /**
   * @param {import('../SvelteApp').SvelteApp} application - The host Foundry application.
   */
  constructor(application) {
    this.#application = application;
    const optionsSessionStorage = application?.options?.sessionStorage;
    if (optionsSessionStorage !== void 0 && !(optionsSessionStorage instanceof TJSWebStorage)) {
      throw new TypeError(`'options.sessionStorage' is not an instance of TJSWebStorage.`);
    }
    this.#sessionStorage = optionsSessionStorage !== void 0 ? optionsSessionStorage : new TJSSessionStorage();
  }
  /**
   * Initializes reactive support. Package private for internal use.
   *
   * @returns {import('./types-local').SvelteReactiveStores | undefined} Internal methods to interact with Svelte
   * stores.
   *
   * @package
   * @internal
   */
  initialize() {
    if (this.#initialized) {
      return;
    }
    this.#initialized = true;
    this.#storesInitialize();
    return {
      appOptionsUpdate: this.#storeAppOptionsUpdate,
      uiStateUpdate: this.#storeUIStateUpdate,
      subscribe: this.#storesSubscribe.bind(this),
      unsubscribe: this.#storesUnsubscribe.bind(this)
    };
  }
  // Store getters -----------------------------------------------------------------------------------------------------
  /**
   * @returns {import('@typhonjs-fvtt/runtime/svelte/store/web-storage').WebStorage} Returns WebStorage (session) instance.
   */
  get sessionStorage() {
    return this.#sessionStorage;
  }
  /**
   * Returns the store for app options.
   *
   * @returns {import('../../types').SvelteApp.API.Reactive.AppOptions} App options store.
   */
  get storeAppOptions() {
    return this.#storeAppOptions;
  }
  /**
   * Returns the store for UI options.
   *
   * @returns {import('../../types').SvelteApp.API.Reactive.UIState} UI options store.
   */
  get storeUIState() {
    return this.#storeUIState;
  }
  // Only reactive getters ---------------------------------------------------------------------------------------------
  /**
   * Returns the current active Window / WindowProxy UI state.
   *
   * @returns {Window} Active window UI state.
   */
  get activeWindow() {
    return this.#dataUIState.activeWindow ?? globalThis;
  }
  /**
   * Returns the current dragging UI state.
   *
   * @returns {boolean} Dragging UI state.
   */
  get dragging() {
    return this.#dataUIState.dragging;
  }
  /**
   * Returns the current minimized UI state.
   *
   * @returns {boolean} Minimized UI state.
   */
  get minimized() {
    return this.#dataUIState.minimized;
  }
  /**
   * Returns the current resizing UI state.
   *
   * @returns {boolean} Resizing UI state.
   */
  get resizing() {
    return this.#dataUIState.resizing;
  }
  /**
   * Sets the current active Window / WindowProxy UI state.
   *
   * Note: This is protected usage and used internally.
   *
   * @param {Window} activeWindow - Active Window / WindowProxy UI state.
   *
   * @internal
   */
  set activeWindow(activeWindow) {
    if (activeWindow === void 0 || activeWindow === null || Object.prototype.toString.call(activeWindow) === "[object Window]") {
      this.#storeUIStateUpdate((options) => deepMerge(options, { activeWindow: activeWindow ?? globalThis }));
    }
  }
  // Reactive getter / setters -----------------------------------------------------------------------------------------
  /**
   * Returns the alwaysOnTop app option.
   *
   * @returns {boolean} Always on top app option.
   */
  get alwaysOnTop() {
    return this.#application?.options?.alwaysOnTop;
  }
  /**
   * Returns the draggable app option.
   *
   * @returns {boolean} Draggable app option.
   */
  get draggable() {
    return this.#application?.options?.draggable;
  }
  /**
   * Returns the focusAuto app option.
   *
   * @returns {boolean} When true auto-management of app focus is enabled.
   */
  get focusAuto() {
    return this.#application?.options?.focusAuto;
  }
  /**
   * Returns the focusKeep app option.
   *
   * @returns {boolean} When `focusAuto` and `focusKeep` is true; keeps internal focus.
   */
  get focusKeep() {
    return this.#application?.options?.focusKeep;
  }
  /**
   * Returns the focusTrap app option.
   *
   * @returns {boolean} When true focus trapping / wrapping is enabled keeping focus inside app.
   */
  get focusTrap() {
    return this.#application?.options?.focusTrap;
  }
  /**
   * Returns the headerButtonNoClose app option.
   *
   * @returns {boolean} Remove the close the button in header app option.
   */
  get headerButtonNoClose() {
    return this.#application?.options?.headerButtonNoClose;
  }
  /**
   * Returns the headerButtonNoLabel app option.
   *
   * @returns {boolean} Remove the labels from buttons in the header app option.
   */
  get headerButtonNoLabel() {
    return this.#application?.options?.headerButtonNoLabel;
  }
  /**
   * Returns the headerIcon app option.
   *
   * @returns {string|void} URL for header app icon.
   */
  get headerIcon() {
    return this.#application?.options?.headerIcon;
  }
  /**
   * Returns the headerNoTitleMinimized app option.
   *
   * @returns {boolean} When true removes the header title when minimized.
   */
  get headerNoTitleMinimized() {
    return this.#application?.options?.headerNoTitleMinimized;
  }
  /**
   * Returns the minimizable app option.
   *
   * @returns {boolean} Minimizable app option.
   */
  get minimizable() {
    return this.#application?.options?.minimizable;
  }
  /**
   * Returns the Foundry popOut state; {@link Application.popOut}
   *
   * @returns {boolean} Positionable app option.
   */
  get popOut() {
    return this.#application.popOut;
  }
  /**
   * Returns the positionable app option; {@link SvelteApp.Options.positionable}
   *
   * @returns {boolean} Positionable app option.
   */
  get positionable() {
    return this.#application?.options?.positionable;
  }
  /**
   * Returns the resizable option.
   *
   * @returns {boolean} Resizable app option.
   */
  get resizable() {
    return this.#application?.options?.resizable;
  }
  /**
   * Returns the title accessor from the parent Application class; {@link Application.title}
   *
   * @privateRemarks
   * TODO: Application v2; note that super.title localizes `this.options.title`; IMHO it shouldn't.    *
   *
   * @returns {string} Title.
   */
  get title() {
    return this.#application.title;
  }
  /**
   * Sets `this.options.alwaysOnTop`, which is reactive for application shells.
   *
   * @param {boolean}  alwaysOnTop - Sets the `alwaysOnTop` option.
   */
  set alwaysOnTop(alwaysOnTop) {
    if (typeof alwaysOnTop === "boolean") {
      this.setOptions("alwaysOnTop", alwaysOnTop);
    }
  }
  /**
   * Sets `this.options.draggable`, which is reactive for application shells.
   *
   * @param {boolean}  draggable - Sets the draggable option.
   */
  set draggable(draggable2) {
    if (typeof draggable2 === "boolean") {
      this.setOptions("draggable", draggable2);
    }
  }
  /**
   * Sets `this.options.focusAuto`, which is reactive for application shells.
   *
   * @param {boolean}  focusAuto - Sets the focusAuto option.
   */
  set focusAuto(focusAuto) {
    if (typeof focusAuto === "boolean") {
      this.setOptions("focusAuto", focusAuto);
    }
  }
  /**
   * Sets `this.options.focusKeep`, which is reactive for application shells.
   *
   * @param {boolean}  focusKeep - Sets the focusKeep option.
   */
  set focusKeep(focusKeep) {
    if (typeof focusKeep === "boolean") {
      this.setOptions("focusKeep", focusKeep);
    }
  }
  /**
   * Sets `this.options.focusTrap`, which is reactive for application shells.
   *
   * @param {boolean}  focusTrap - Sets the focusTrap option.
   */
  set focusTrap(focusTrap) {
    if (typeof focusTrap === "boolean") {
      this.setOptions("focusTrap", focusTrap);
    }
  }
  /**
   * Sets `this.options.headerButtonNoClose`, which is reactive for application shells.
   *
   * @param {boolean}  headerButtonNoClose - Sets the headerButtonNoClose option.
   */
  set headerButtonNoClose(headerButtonNoClose) {
    if (typeof headerButtonNoClose === "boolean") {
      this.setOptions("headerButtonNoClose", headerButtonNoClose);
    }
  }
  /**
   * Sets `this.options.headerButtonNoLabel`, which is reactive for application shells.
   *
   * @param {boolean}  headerButtonNoLabel - Sets the headerButtonNoLabel option.
   */
  set headerButtonNoLabel(headerButtonNoLabel) {
    if (typeof headerButtonNoLabel === "boolean") {
      this.setOptions("headerButtonNoLabel", headerButtonNoLabel);
    }
  }
  /**
   * Sets `this.options.headerIcon`, which is reactive for application shells.
   *
   * @param {string | undefined}  headerIcon - Sets the headerButtonNoLabel option.
   */
  set headerIcon(headerIcon) {
    if (headerIcon === void 0 || typeof headerIcon === "string") {
      this.setOptions("headerIcon", headerIcon);
    }
  }
  /**
   * Sets `this.options.headerNoTitleMinimized`, which is reactive for application shells.
   *
   * @param {boolean}  headerNoTitleMinimized - Sets the headerNoTitleMinimized option.
   */
  set headerNoTitleMinimized(headerNoTitleMinimized) {
    if (typeof headerNoTitleMinimized === "boolean") {
      this.setOptions("headerNoTitleMinimized", headerNoTitleMinimized);
    }
  }
  /**
   * Sets `this.options.minimizable`, which is reactive for application shells that are also pop out.
   *
   * @param {boolean}  minimizable - Sets the minimizable option.
   */
  set minimizable(minimizable) {
    if (typeof minimizable === "boolean") {
      this.setOptions("minimizable", minimizable);
    }
  }
  /**
   * Sets `this.options.popOut` which is reactive for application shells. This will add / remove this application
   * from `ui.windows` via the subscription set in `#storesSubscribe`.
   *
   * @param {boolean}  popOut - Sets the popOut option.
   */
  set popOut(popOut) {
    if (typeof popOut === "boolean") {
      this.setOptions("popOut", popOut);
    }
  }
  /**
   * Sets `this.options.positionable`, enabling / disabling {@link SvelteApp.position}.
   *
   * @param {boolean}  positionable - Sets the positionable option.
   */
  set positionable(positionable) {
    if (typeof positionable === "boolean") {
      this.setOptions("positionable", positionable);
    }
  }
  /**
   * Sets `this.options.resizable`, which is reactive for application shells.
   *
   * @param {boolean}  resizable - Sets the resizable option.
   */
  set resizable(resizable) {
    if (typeof resizable === "boolean") {
      this.setOptions("resizable", resizable);
    }
  }
  /**
   * Sets `this.options.title`, which is reactive for application shells.
   *
   * Note: Will set empty string if title is undefined or null.
   *
   * @param {string | undefined | null}   title - Application title; will be localized, so a translation key is fine.
   */
  set title(title) {
    if (typeof title === "string") {
      this.setOptions("title", title);
    } else if (title === void 0 || title === null) {
      this.setOptions("title", "");
    }
  }
  // Reactive Options API -------------------------------------------------------------------------------------------
  /**
   * Provides a way to safely get this applications options given an accessor string which describes the
   * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
   * to walk.
   *
   * // TODO DOCUMENT the accessor in more detail.
   *
   * @param {string}   accessor - The path / key to set. You can set multiple levels.
   *
   * @param {*}        [defaultValue] - A default value returned if the accessor is not found.
   *
   * @returns {*} Value at the accessor.
   */
  getOptions(accessor, defaultValue) {
    return safeAccess(this.#application.options, accessor, defaultValue);
  }
  /**
   * Provides a way to merge `options` into the application options and update the appOptions store.
   *
   * @param {object}   options - The options object to merge with `this.options`.
   */
  mergeOptions(options) {
    this.#storeAppOptionsUpdate((instanceOptions) => deepMerge(instanceOptions, options));
  }
  /**
   * Provides a way to safely set the application options given an accessor string which describes the
   * entries to walk. To access deeper entries into the object format, the accessor string with `.` between entries
   * to walk.
   *
   * Additionally, if an application shell Svelte component is mounted and exports the `appOptions` property, then
   * the application options are set to `appOptions` potentially updating the application shell / Svelte component.
   *
   * @param {string}   accessor - The path / key to set. You can set multiple levels.
   *
   * @param {any}      value - Value to set.
   */
  setOptions(accessor, value) {
    const success = safeSet(this.#application.options, accessor, value, { createMissing: true });
    if (success) {
      this.#storeAppOptionsUpdate(() => this.#application.options);
    }
  }
  /**
   * Serializes the main {@link SvelteApp.Options} for common application state.
   *
   * @returns {import('../../types').SvelteApp.API.Reactive.SerializedData} Common application state.
   */
  toJSON() {
    return {
      alwaysOnTop: this.#application?.options?.alwaysOnTop ?? false,
      draggable: this.#application?.options?.draggable ?? true,
      focusAuto: this.#application?.options?.focusAuto ?? true,
      focusKeep: this.#application?.options?.focusKeep ?? false,
      focusTrap: this.#application?.options?.focusTrap ?? true,
      headerButtonNoClose: this.#application?.options?.headerButtonNoClose ?? false,
      headerButtonNoLabel: this.#application?.options?.headerButtonNoLabel ?? false,
      headerNoTitleMinimized: this.#application?.options?.headerNoTitleMinimized ?? false,
      minimizable: this.#application?.options?.minimizable ?? true,
      positionable: this.#application?.options?.positionable ?? true,
      resizable: this.#application?.options?.resizable ?? true
    };
  }
  /**
   * Updates the UI Options store with the current header buttons. You may dynamically add / remove header buttons
   * if using an application shell Svelte component. In either overriding `_getHeaderButtons` or responding to the
   * Hooks fired return a new button array, and the uiOptions store is updated, and the application shell will render
   * the new buttons.
   *
   * Optionally you can set in the SvelteApp app options {@link SvelteApp.Options.headerButtonNoClose}
   * to remove the close button from the header buttons.
   *
   * @param {object} [opts] - Optional parameters (for internal use)
   *
   * @param {boolean} [opts.headerButtonNoClose] - The value for `headerButtonNoClose`.
   */
  updateHeaderButtons({ headerButtonNoClose = this.#application.options.headerButtonNoClose } = {}) {
    let buttons = this.#application._getHeaderButtons();
    if (typeof headerButtonNoClose === "boolean" && headerButtonNoClose) {
      buttons = buttons.filter((button) => button.class !== "close");
    }
    const closeButton = buttons.find((button) => button.class === "close");
    if (closeButton) {
      closeButton.label = "APPLICATION.TOOLS.Close";
    }
    this.#storeUIStateUpdate((options) => {
      options.headerButtons = buttons;
      return options;
    });
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Initializes the Svelte stores and derived stores for the application options and UI state.
   *
   * While writable stores are created, the update method is stored in private variables locally and derived Readable
   * stores are provided for essential options which are commonly used.
   *
   * These stores are injected into all Svelte components mounted under the `external` context: `storeAppOptions` and
   * `storeUIState`.
   */
  #storesInitialize() {
    const writableAppOptions = writable(this.#application.options);
    this.#storeAppOptionsUpdate = writableAppOptions.update;
    const storeAppOptions = {
      subscribe: writableAppOptions.subscribe,
      alwaysOnTop: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "alwaysOnTop")
      ),
      draggable: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "draggable")
      ),
      focusAuto: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "focusAuto")
      ),
      focusKeep: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "focusKeep")
      ),
      focusTrap: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "focusTrap")
      ),
      headerButtonNoClose: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "headerButtonNoClose")
      ),
      headerButtonNoLabel: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "headerButtonNoLabel")
      ),
      headerIcon: (
        /** @type {import('svelte/store').Writable<string>} */
        propertyStore(writableAppOptions, "headerIcon")
      ),
      headerNoTitleMinimized: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "headerNoTitleMinimized")
      ),
      minimizable: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "minimizable")
      ),
      popOut: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "popOut")
      ),
      positionable: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "positionable")
      ),
      resizable: (
        /** @type {import('svelte/store').Writable<boolean>} */
        propertyStore(writableAppOptions, "resizable")
      ),
      title: (
        /** @type {import('svelte/store').Writable<string>} */
        propertyStore(writableAppOptions, "title")
      )
    };
    Object.freeze(storeAppOptions);
    this.#storeAppOptions = storeAppOptions;
    this.#dataUIState = {
      activeWindow: globalThis,
      dragging: false,
      headerButtons: [],
      minimized: this.#application._minimized,
      resizing: false
    };
    const writableUIOptions = writable(this.#dataUIState);
    this.#storeUIStateUpdate = writableUIOptions.update;
    const storeUIState = {
      subscribe: writableUIOptions.subscribe,
      activeWindow: (
        /** @type {import('svelte/store').Readable<Window>} */
        derived(writableUIOptions, ($options, set) => set($options.activeWindow))
      ),
      dragging: (
        /** @type {import('svelte/store').Readable<boolean>} */
        propertyStore(writableUIOptions, "dragging")
      ),
      headerButtons: (
        /** @type {import('svelte/store').Readable<import('../../types').SvelteApp.HeaderButton>} */
        derived(writableUIOptions, ($options, set) => set($options.headerButtons))
      ),
      minimized: (
        /** @type {import('svelte/store').Readable<boolean>} */
        derived(writableUIOptions, ($options, set) => set($options.minimized))
      ),
      resizing: (
        /** @type {import('svelte/store').Readable<boolean>} */
        propertyStore(writableUIOptions, "resizing")
      )
    };
    Object.freeze(storeUIState);
    this.#storeUIState = storeUIState;
  }
  /**
   * Registers local store subscriptions for app options. `popOut` controls registering this app with `ui.windows`.
   *
   * @see SvelteApp._injectHTML
   */
  #storesSubscribe() {
    this.#storeUnsubscribe.push(subscribeIgnoreFirst(
      this.#storeAppOptions.alwaysOnTop,
      (enabled) => handleAlwaysOnTop(this.#application, enabled)
    ));
    this.#storeUnsubscribe.push(subscribeIgnoreFirst(this.#storeAppOptions.headerButtonNoClose, (value) => this.updateHeaderButtons({ headerButtonNoClose: value })));
    this.#storeUnsubscribe.push(subscribeIgnoreFirst(this.#storeAppOptions.popOut, (value) => {
      if (value) {
        if (globalThis?.ui?.windows?.[this.#application.appId] !== this.#application) {
          globalThis.ui.windows[this.#application.appId] = this.#application;
        }
      } else {
        if (globalThis?.ui?.activeWindow === this.#application) {
          globalThis.ui.activeWindow = null;
        }
        if (globalThis?.ui?.windows?.[this.#application.appId] === this.#application) {
          delete globalThis.ui.windows[this.#application.appId];
        }
      }
    }));
  }
  /**
   * Unsubscribes from any locally monitored stores.
   *
   * @see SvelteApp.close
   */
  #storesUnsubscribe() {
    this.#storeUnsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#storeUnsubscribe = [];
  }
};
var TJSAppIndex = class {
  /**
   * Stores all visible / rendered apps.
   *
   * @type {Map<string, import('@typhonjs-fvtt/runtime/svelte/application').SvelteApp>}
   */
  static #visibleApps = /* @__PURE__ */ new Map();
  /**
   * Adds a SvelteApp to all visible apps tracked.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/application').SvelteApp} app - A SvelteApp
   *
   * @package
   */
  static add(app) {
    this.#visibleApps.set(app.id, app);
  }
  /**
   * Removes a SvelteApp from all visible apps tracked.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/application').SvelteApp} app - A SvelteApp
   *
   * @package
   */
  static delete(app) {
    this.#visibleApps.delete(app.id);
  }
  /**
   * Gets a particular app by ID.
   *
   * @param {string}   key - App ID.
   *
   * @returns {import('@typhonjs-fvtt/runtime/svelte/application').SvelteApp} Associated app.
   */
  static get(key) {
    return this.#visibleApps.get(key);
  }
  /**
   * Returns whether an associated app by ID is being tracked.
   *
   * @param {string}   key - App ID.
   *
   * @returns {boolean} The given App ID is visible.
   */
  static has(key) {
    return this.#visibleApps.has(key);
  }
  /**
   * @returns {IterableIterator<string>} All visible app IDs.
   */
  static keys() {
    return this.#visibleApps.keys();
  }
  /**
   * @returns {IterableIterator<import('@typhonjs-fvtt/runtime/svelte/application').SvelteApp>} All visible apps.
   */
  static values() {
    return this.#visibleApps.values();
  }
};
var FoundryHMRSupport = class {
  static initialize() {
    if (import.meta.hot) {
      Hooks.on("hotReload", (data) => {
        if (data?.extension === "json") {
          setTimeout(() => {
            for (const app of TJSAppIndex.values()) {
              const appShell = app.svelte.appShell;
              const hmrComponent = appShell?.$$?.hmr_cmp;
              if (appShell && typeof hmrComponent?.$replace === "function") {
                const svelteData = app.svelte.appShellData;
                if (svelteData) {
                  try {
                    hmrComponent.$replace(hmrComponent.constructor, {
                      target: svelteData.config.target,
                      anchor: svelteData.config.anchor,
                      preserveLocalState: true,
                      conservative: true
                    });
                  } catch (error) {
                    const name = hmrComponent?.constructor?.name ?? "Unknown";
                    console.error(`TyphonJS Runtime Library error; Could not hot reload component: '${name}'`);
                    console.error(error);
                  }
                }
              }
            }
          }, 0);
        }
        return true;
      });
    }
  }
};
var FoundryStyles = class {
  /**
   * Parsed Foundry core stylesheet.
   *
   * @type {StyleSheetResolve}
   */
  static #core;
  /**
   * Parsed Foundry core stylesheet with extended game system / module overrides.
   *
   * @type {StyleSheetResolve}
   */
  static #ext;
  static #initialized = false;
  /**
   * @hideconstructor
   */
  constructor() {
    throw new Error("FoundryStyles constructor: This is a static class and should not be constructed.");
  }
  /**
   * @returns {StyleSheetResolve} Core parsed styles.
   */
  static get core() {
    if (!this.#initialized) {
      this.#initialize();
    }
    return this.#core;
  }
  /**
   * @returns {StyleSheetResolve} Core parsed styles with extended game system / module overrides.
   */
  static get ext() {
    if (!this.#initialized) {
      this.#initialize();
    }
    return this.#ext;
  }
  // Internal Implementation ----------------------------------------------------------------------------------------
  /**
   * Find the core Foundry CSSStyleSheet instance and any 3rd party game system / module stylesheets.
   *
   * Resolve the core sheet and then create the extended resolved style sheet merging the core with all system / module
   * sheets.
   */
  static #initialize() {
    this.#initialized = true;
    const styleSheets = Array.from(document.styleSheets);
    let foundryStyleSheet;
    const moduleSheets = [];
    const systemSheets = [];
    for (const sheet of styleSheets) {
      if (typeof sheet?.href === "string" && sheet.href.endsWith("/css/foundry2.css")) {
        foundryStyleSheet = sheet;
      } else {
        if (sheet?.cssRules?.length) {
          for (const rule of sheet.cssRules) {
            if (!CrossWindow.isCSSImportRule(rule) || !CrossWindow.isCSSStyleSheet(rule?.styleSheet)) {
              continue;
            }
            if (rule.layerName === "modules") {
              moduleSheets.push(rule.styleSheet);
            }
            if (rule.layerName === "system") {
              systemSheets.push(rule.styleSheet);
            }
          }
        }
      }
    }
    if (!foundryStyleSheet) {
      console.error(`[TyphonJS Runtime] error: FoundryStyles could not load core stylesheet.`);
      return;
    }
    this.#resolveCore(foundryStyleSheet);
    this.#resolveExt(moduleSheets, systemSheets);
    this.#core.freeze();
    this.#ext.freeze();
  }
  /**
   * @param {CSSStyleSheet}  sheet - Foundry core style sheet.
   */
  static #resolveCore(sheet) {
    this.#core = StyleSheetResolve.parse(sheet, {
      // Exclude any selector parts that match the following.
      excludeSelectorParts: [
        />\s*[^ ]+/,
        // Direct child selectors
        /(^|\s)\*/,
        // Universal selectors
        /(^|\s)\.app(?![\w-])/,
        // AppV1 class
        /^\.application\.theme/,
        /^body\.auth/,
        /^body(?:\.[\w-]+)*\.application\b/,
        // Remove unnecessary `body.<theme>.application` pairing.
        /^\.\u037c\d/i,
        // Code-mirror `.ͼ1`
        /code-?mirror/i,
        /#camera-views/,
        /(^|[^a-zA-Z0-9_-])#(?!context-menu\b)[\w-]+|[^ \t>+~]#context-menu\b/,
        /(^|\s)kbd\b/,
        /^input.placeholder-fa-solid\b/,
        /(^|\s)label\b/,
        /\.placeable-hud/,
        /prose-?mirror/i,
        /(^|\s)section\b/,
        /\.ui-control/,
        /\.window-app/,
        // Exclude various core applications.
        /^\.active-effect-config/,
        /^\.adventure-importer/,
        /^\.camera-view/,
        /^\.cards-config/,
        /^\.category-browser/,
        /^\.document-ownership/,
        /^\.journal-category-config/,
        /\.journal-entry-page/,
        /^\.package-list/,
        /^\.playlists-sidebar/,
        /^\.region-config/,
        /^\.roll-table-sheet/,
        /^\.scene-config/,
        /^\.sheet.journal-entry/,
        /^\.token-config/,
        /^\.tour/,
        /^\.wall-config/
      ],
      // Only parse CSS layers matching the following regexes.
      includeCSSLayers: [
        /^applications$/,
        /^variables\.base$/,
        /^variables\.themes/,
        /^elements/
      ]
    });
  }
  /**
   * @param {CSSStyleSheet[]}   moduleSheets - Module stylesheet data.
   *
   * @param {CSSStyleSheet[]}   systemSheets - System stylesheet data.
   */
  static #resolveExt(moduleSheets, systemSheets) {
    const resolvedSheets = [];
    const options = { includeSelectorPartSet: /* @__PURE__ */ new Set([...this.#core.keys()]) };
    for (const sheet of systemSheets) {
      resolvedSheets.push(StyleSheetResolve.parse(sheet, options));
    }
    for (const sheet of moduleSheets) {
      resolvedSheets.push(StyleSheetResolve.parse(sheet, options));
    }
    this.#ext = this.#core.clone();
    for (const sheet of resolvedSheets) {
      this.#ext.merge(sheet);
    }
  }
};
var SvelteApp = class _SvelteApp extends Application {
  /**
   * Disable Foundry v13+ warnings for AppV1.
   *
   * @type {boolean}
   * @internal
   */
  static _warnedAppV1 = true;
  static #MIN_WINDOW_HEIGHT = 50;
  static #MIN_WINDOW_WIDTH = 200;
  /**
   * Stores the first mounted component which follows the application shell contract.
   *
   * @type {import('svelte').SvelteComponent[] | null[]} Application shell.
   */
  #applicationShellHolder = [null];
  /**
   * Stores and manages application state for saving / restoring / serializing.
   *
   * @type {import('./types').SvelteApp.API.State}
   */
  #applicationState;
  /**
   * Stores the target element which may not necessarily be the main element.
   *
   * @type {HTMLElement}
   */
  #elementTarget = null;
  /**
   * Stores the content element which is set for application shells.
   *
   * @type {HTMLElement}
   */
  #elementContent = null;
  /**
   * On initial render gating of `setPosition` invoked by `Application._render` occurs, so that percentage values
   * can correctly be positioned with initial helper constraints (centered).
   *
   * @type {boolean}
   */
  #gateSetPosition = false;
  /**
   * Stores initial z-index from `_renderOuter` to set to target element / Svelte component.
   *
   * @type {number}
   */
  #initialZIndex = 95;
  /**
   * Stores on mount state which is checked in _render to trigger onSvelteMount callback.
   *
   * @type {boolean}
   */
  #onMount = false;
  /**
   * The position store.
   *
   * @type {TJSPosition}
   */
  #position;
  /**
   * Contains the Svelte stores and reactive accessors.
   *
   * @type {SvelteReactive}
   */
  #reactive;
  /**
   * Stores SvelteData entries with instantiated Svelte components.
   *
   * @type {import('./internal/state-svelte/types').SvelteData[] | null[]}
   */
  #svelteData = [null];
  /**
   * Provides a helper class that combines multiple methods for interacting with the mounted components tracked in
   * #svelteData.
   *
   * @type {import('./types').SvelteApp.API.Svelte<Options>}
   */
  #getSvelteData = new GetSvelteData(this.#applicationShellHolder, this.#svelteData);
  /**
   * Contains methods to interact with the Svelte stores.
   *
   * @type {import('./internal/state-reactive/types-local').SvelteReactiveStores}
   */
  #stores;
  /**
   * @param {Partial<import('./types').SvelteApp.Options>} [options] - The options for the application.
   */
  constructor(options = {}) {
    super(options);
    if (!isObject(this.options.svelte)) {
      throw new Error(`SvelteApp - constructor - No Svelte configuration object found in 'options'.`);
    }
    this.#applicationState = new ApplicationState(this);
    this.#position = new TJSPosition(this, {
      ...this.position,
      ...this.options,
      initial: this.options.positionInitial,
      ortho: this.options.positionOrtho,
      validator: this.options.positionValidator
    });
    delete this.position;
    Object.defineProperty(this, "position", {
      get: () => this.#position,
      set: (position) => {
        if (isObject(position)) {
          this.#position.set(position);
        }
      }
    });
    this.#reactive = new SvelteReactive(this);
    this.#stores = this.#reactive.initialize();
  }
  /**
   * Specifies the default options that SvelteApp supports.
   *
   * @returns {import('./types').SvelteApp.Options} options - Application options.
   * @see https://foundryvtt.com/api/interfaces/client.ApplicationOptions.html
   */
  static get defaultOptions() {
    return (
      /** @type {import('./types').SvelteApp.Options} */
      deepMerge(super.defaultOptions, {
        alwaysOnTop: false,
        // Assigned to position. When true, the app window is floated always on top.
        defaultCloseAnimation: true,
        // If false, the default slide close animation is not run.
        draggable: true,
        // If true, then application shells are draggable.
        focusAuto: true,
        // When true, auto-management of app focus is enabled.
        focusKeep: false,
        // When `focusAuto` and `focusKeep` is true; keeps internal focus.
        focusSource: void 0,
        // Stores any A11yFocusSource data that is applied when app is closed.
        focusTrap: true,
        // When true focus trapping / wrapping is enabled keeping focus inside app.
        headerButtonNoClose: false,
        // If true, then the close header button is removed.
        headerButtonNoLabel: false,
        // If true, then the header button labels are removed for application shells.
        headerIcon: void 0,
        // Sets a header icon given an image URL.
        headerNoTitleMinimized: false,
        // If true, then the header title is hidden when the application is minimized.
        maxHeight: void 0,
        // Assigned to position. Number specifying maximum window height.
        maxWidth: void 0,
        // Assigned to position. Number specifying maximum window width.
        minHeight: _SvelteApp.#MIN_WINDOW_HEIGHT,
        // Assigned to position. Number specifying minimum window height.
        minWidth: _SvelteApp.#MIN_WINDOW_WIDTH,
        // Assigned to position. Number specifying minimum window width.
        positionable: true,
        // If false, then `position.set` does not take effect.
        positionInitial: TJSPosition.Initial.browserCentered,
        // A helper for initial position placement.
        positionOrtho: true,
        // When true, TJSPosition is optimized for orthographic use.
        positionValidator: TJSPosition.Validators.transformWindow,
        // A function providing the default validator.
        sessionStorage: void 0,
        // An instance of WebStorage (session) to share across SvelteApps.
        svelte: void 0,
        // A Svelte configuration object.
        transformOrigin: "top left"
        // By default, 'top / left' respects rotation when minimizing.
      })
    );
  }
  /**
   * Returns the content element if an application shell is mounted.
   *
   * @returns {HTMLElement} Content element.
   */
  get elementContent() {
    return this.#elementContent;
  }
  /**
   * Returns the target element or main element if no target defined.
   *
   * @returns {HTMLElement} Target element.
   */
  get elementTarget() {
    return this.#elementTarget;
  }
  /**
   * Returns the reactive accessors & Svelte stores for SvelteApp.
   *
   * @returns {import('./types').SvelteApp.API.Reactive} The reactive accessors & Svelte stores.
   */
  get reactive() {
    return this.#reactive;
  }
  /**
   * Returns the application state manager.
   *
   * @returns {import('./types').SvelteApp.API.State} The application state manager.
   */
  get state() {
    return this.#applicationState;
  }
  /**
   * Returns the `Svelte` helper class w/ various methods to access the mounted application shell component.
   *
   * @returns {import('./types').SvelteApp.API.Svelte<Options>} `Svelte` / mounted application shell API.
   */
  get svelte() {
    return this.#getSvelteData;
  }
  /**
   * In this case of when a template is defined in app options `html` references the inner HTML / template. However,
   * to activate classic v1 tabs for a Svelte component the element target is passed as an array simulating JQuery as
   * the element is retrieved immediately and the core listeners use standard DOM queries.
   *
   * @protected
   * @ignore
   * @internal
   */
  _activateCoreListeners(html) {
    super._activateCoreListeners(typeof this.options.template === "string" ? html : [this.popOut ? this.#elementTarget?.firstChild : this.#elementTarget]);
  }
  /**
   * Provide an override to set this application as the active window regardless of z-index. Changes behaviour from
   * Foundry core.
   *
   * @param {object} [opts] - Optional parameters.
   *
   * @param {boolean} [opts.focus=true] - When true and the active element is not contained in the app `elementTarget`
   *        is focused..
   *
   * @param {boolean} [opts.force=false] - Force bring to top; will increment z-index by popOut order.
   *
   * @ignore
   * @internal
   */
  bringToTop({ focus = true, force = false } = {}) {
    if (this.reactive.activeWindow !== globalThis) {
      return;
    }
    if (typeof this?.options?.positionable === "boolean" && !this.options.positionable) {
      return;
    }
    if (force || globalThis.ui.activeWindow !== this) {
      const z = this.position.zIndex;
      if (this.popOut && z < foundry.applications.api.ApplicationV2._maxZ) {
        this.position.zIndex = Math.min(++foundry.applications.api.ApplicationV2._maxZ, 99999);
      } else if (!this.popOut && this.options.alwaysOnTop) {
        const newAlwaysOnTopZIndex = globalThis?.TRL_SVELTE_APP_DATA?.alwaysOnTop?.getAndIncrement();
        if (typeof newAlwaysOnTopZIndex === "number") {
          this.position.zIndex = newAlwaysOnTopZIndex;
        }
      }
    }
    const elementTarget = this.elementTarget;
    const activeElement = document.activeElement;
    if (focus && elementTarget && activeElement !== elementTarget && !elementTarget?.contains(activeElement)) {
      if (A11yHelper.isFocusTarget(activeElement)) {
        activeElement.blur();
      }
      elementTarget?.focus();
    }
    globalThis.ui.activeWindow = this;
  }
  /**
   * Note: This method is fully overridden and duplicated as Svelte components need to be destroyed manually and the
   * best visual result is to destroy them after the default slide up animation occurs, but before the element
   * is removed from the DOM.
   *
   * If you destroy the Svelte components before the slide up animation the Svelte elements are removed immediately
   * from the DOM. The purpose of overriding ensures the slide up animation is always completed before
   * the Svelte components are destroyed and then the element is removed from the DOM.
   *
   * Close the application and unregisters references to it within UI mappings.
   * This function returns a Promise which resolves once the window closing animation concludes.
   *
   * @param {object}   [options] - Optional parameters.
   *
   * @param {boolean}  [options.force] - Force close regardless of render state.
   *
   * @returns {Promise<void>}    A Promise which resolves once the application is closed.
   *
   * @ignore
   * @internal
   */
  async close(options = {}) {
    const states = Application.RENDER_STATES;
    if (!options.force && ![states.RENDERED, states.ERROR].includes(this._state)) {
      return;
    }
    const el = this.#elementTarget;
    if (!el) {
      this._state = states.CLOSED;
      return;
    }
    if (CrossWindow.getWindow(el, { throws: false }) !== globalThis) {
      return;
    }
    this._state = states.CLOSING;
    this.#stores.unsubscribe();
    const content = el.querySelector(".window-content");
    if (content) {
      content.style.overflow = "hidden";
      for (let cntr = content.children.length; --cntr >= 0; ) {
        content.children[cntr].style.overflow = "hidden";
      }
    }
    for (const cls of this.constructor._getInheritanceChain()) {
      Hooks.call(`close${cls.name}`, this, $(el));
    }
    const animate = typeof this.options.defaultCloseAnimation === "boolean" ? this.options.defaultCloseAnimation : true;
    if (animate) {
      el.style.minHeight = "0";
      const { paddingBottom, paddingTop } = globalThis.getComputedStyle(el);
      await el.animate([
        { maxHeight: `${el.clientHeight}px`, paddingTop, paddingBottom },
        { maxHeight: 0, paddingTop: 0, paddingBottom: 0 }
      ], { duration: 250, easing: "ease-in", fill: "forwards" }).finished;
    }
    const svelteDestroyPromises = [];
    for (const entry of this.#svelteData) {
      if (!isObject(entry)) {
        continue;
      }
      svelteDestroyPromises.push(TJSSvelte.util.outroAndDestroy(entry.component));
      const eventbus = entry.config.eventbus;
      if (isObject(eventbus) && typeof eventbus.off === "function") {
        eventbus.off();
        entry.config.eventbus = void 0;
      }
    }
    await Promise.allSettled(svelteDestroyPromises);
    TJSAppIndex.delete(this);
    this.#svelteData[0] = null;
    el.remove();
    this.position.state.restore({
      name: "#beforeMinimized",
      properties: ["width", "height"],
      silent: true,
      remove: true
    });
    this.#applicationShellHolder[0] = null;
    this._element = null;
    this.#elementContent = null;
    this.#elementTarget = null;
    delete globalThis.ui.windows[this.appId];
    this._minimized = false;
    this._scrollPositions = null;
    this._state = states.CLOSED;
    this.#onMount = false;
    this.#stores.uiStateUpdate((storeOptions) => deepMerge(storeOptions, { minimized: this._minimized }));
    A11yHelper.applyFocusSource(this.options.focusSource);
    delete this.options.focusSource;
  }
  /**
   * Specify the set of config buttons which should appear in the SvelteApp header. Buttons should be returned as
   * an Array of objects. The header buttons which are added to the application can be modified by the
   * `getApplicationHeaderButtons` hook.
   *
   * SvelteApp extends the button functionality with full reactivity for state changes during callbacks. Callbacks
   * receive the button data and can modify it to update the button state.
   *
   * @privateRemarks Provide a basic override implementation to extend types with additional SvelteApp functionality.
   *
   * @returns {import('./types').SvelteApp.HeaderButton[]} All header buttons.
   * @protected
   */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    const closeButton = buttons.find((entry) => entry?.class === "close");
    if (closeButton) {
      closeButton.onclick = () => {
        globalThis?.game?.tooltip?.deactivate?.();
        this.close();
      };
    }
    return buttons;
  }
  /**
   * Inject the Svelte components defined in `this.options.svelte`. The Svelte component can attach to the existing
   * pop-out of Application or provide no template and render into a document fragment which is then attached to the
   * DOM.
   *
   * @protected
   * @ignore
   * @internal
   */
  _injectHTML() {
    this.reactive.updateHeaderButtons();
    const elementRootUpdate = () => {
      let cntr = 0;
      return (elementRoot) => {
        if (elementRoot !== null && elementRoot !== void 0 && cntr++ > 0) {
          this.#updateApplicationShell();
          return true;
        }
        return false;
      };
    };
    if (!isObject(this.options.svelte)) {
      throw new Error(`SvelteApp - _injectHTML - No Svelte configuration object found in 'options'.`);
    }
    const svelteData = loadSvelteConfig({
      app: this,
      config: this.options.svelte,
      elementRootUpdate
    });
    if (this.svelte.appShell !== null) {
      throw new Error(
        `SvelteApp - _injectHTML - An application shell is already mounted; offending config:
${JSON.stringify(this.options.svelte)}`
      );
    }
    this.#applicationShellHolder[0] = svelteData.component;
    if (TJSSvelte.util.isHMRProxy(svelteData.component) && Array.isArray(svelteData.component?.$$?.on_hmr)) {
      svelteData.component.$$.on_hmr.push(() => () => this.#updateApplicationShell());
    }
    this.#svelteData[0] = svelteData;
    this._element = $(this.svelte.appShell.elementRoot);
    this.#elementContent = hasGetter(this.svelte.appShell, "elementContent") ? this.svelte.appShell.elementContent : null;
    this.#elementTarget = hasGetter(this.svelte.appShell, "elementTarget") ? this.svelte.appShell.elementTarget : this.svelte.appShell.elementRoot;
    if (typeof this.options.positionable === "boolean" && this.options.positionable) {
      this.#elementTarget.style.zIndex = typeof this.options.zIndex === "number" ? this.options.zIndex : this.#initialZIndex ?? 95;
    }
    this.#stores.subscribe();
  }
  /**
   * Provides a mechanism to update the UI options store for maximized.
   *
   * Note: the sanity check is duplicated from {@link Application.maximize} the store is updated _before_
   * performing the rest of animations. This allows application shells to remove / show any resize handlers
   * correctly. Extra constraint data is stored in a saved position state in {@link SvelteApp.minimize}
   * to animate the content area.
   *
   * @param {object}   [opts] - Optional parameters.
   *
   * @param {boolean}  [opts.animate=true] - When true perform default maximizing animation.
   *
   * @param {number}   [opts.duration=0.1] - Controls content area animation duration in seconds.
   */
  async maximize({ animate = true, duration = 0.1 } = {}) {
    if (!this.popOut || [false, null].includes(this._minimized)) {
      return;
    }
    this._minimized = null;
    const durationMS = duration * 1e3;
    const element2 = this.elementTarget;
    const header = element2.querySelector(".window-header");
    const content = element2.querySelector(".window-content");
    const positionBefore = this.position.state.get({ name: "#beforeMinimized" });
    if (animate) {
      await this.position.state.restore({
        name: "#beforeMinimized",
        async: true,
        animateTo: true,
        properties: ["width"],
        cancelable: false,
        duration: 0.1
      });
    }
    element2.classList.remove("minimized");
    for (let cntr = header.children.length; --cntr >= 0; ) {
      header.children[cntr].style.display = null;
    }
    content.style.display = null;
    let constraints;
    if (animate) {
      ({ constraints } = this.position.state.restore({
        name: "#beforeMinimized",
        animateTo: true,
        properties: ["height"],
        remove: true,
        cancelable: false,
        duration
      }));
    } else {
      ({ constraints } = this.position.state.remove({ name: "#beforeMinimized" }));
    }
    await content.animate([
      { maxHeight: 0, paddingTop: 0, paddingBottom: 0, offset: 0 },
      { ...constraints, offset: 1 },
      { maxHeight: "100%", offset: 1 }
    ], { duration: durationMS, fill: "forwards" }).finished;
    this.position.set({
      minHeight: positionBefore.minHeight ?? this.options?.minHeight ?? _SvelteApp.#MIN_WINDOW_HEIGHT,
      minWidth: positionBefore.minWidth ?? this.options?.minWidth ?? _SvelteApp.#MIN_WINDOW_WIDTH
    });
    element2.style.minWidth = null;
    element2.style.minHeight = null;
    this._minimized = false;
    setTimeout(() => {
      content.style.overflow = null;
      for (let cntr = content.children.length; --cntr >= 0; ) {
        content.children[cntr].style.overflow = null;
      }
    }, 50);
    this.#stores.uiStateUpdate((options) => deepMerge(options, { minimized: false }));
  }
  /**
   * Provides a mechanism to update the UI options store for minimized.
   *
   * Note: the sanity check is duplicated from {@link Application.minimize} the store is updated _before_
   * performing the rest of animations. This allows application shells to remove / show any resize handlers
   * correctly. Extra constraint data is stored in a saved position state in {@link SvelteApp.minimize}
   * to animate the content area.
   *
   * @param {object}   [opts] - Optional parameters.
   *
   * @param {boolean}  [opts.animate=true] - When true perform default minimizing animation.
   *
   * @param {number}   [opts.duration=0.1] - Controls content area animation duration in seconds.
   */
  async minimize({ animate = true, duration = 0.1 } = {}) {
    if (!this.rendered || !this.popOut || [true, null].includes(this._minimized)) {
      return;
    }
    this.#stores.uiStateUpdate((options) => deepMerge(options, { minimized: true }));
    this._minimized = null;
    const durationMS = duration * 1e3;
    const element2 = this.elementTarget;
    const header = element2.querySelector(".window-header");
    const content = element2.querySelector(".window-content");
    const beforeMinWidth = this.position.minWidth;
    const beforeMinHeight = this.position.minHeight;
    this.position.set({ minWidth: 100, minHeight: 30 });
    element2.style.minWidth = "100px";
    element2.style.minHeight = "30px";
    if (content) {
      content.style.overflow = "hidden";
      for (let cntr = content.children.length; --cntr >= 0; ) {
        content.children[cntr].style.overflow = "hidden";
      }
    }
    const { paddingBottom, paddingTop } = globalThis.getComputedStyle(content);
    const constraints = {
      maxHeight: `${content.clientHeight}px`,
      paddingTop,
      paddingBottom
    };
    if (animate) {
      const animation = content.animate([
        constraints,
        { maxHeight: 0, paddingTop: 0, paddingBottom: 0 }
      ], { duration: durationMS, fill: "forwards" });
      animation.finished.then(() => content.style.display = "none");
    } else {
      setTimeout(() => content.style.display = "none", durationMS);
    }
    const saved = this.position.state.save({ name: "#beforeMinimized", constraints });
    saved.minWidth = beforeMinWidth;
    saved.minHeight = beforeMinHeight;
    const headerOffsetHeight = header.offsetHeight;
    this.position.minHeight = headerOffsetHeight;
    if (animate) {
      await this.position.animate.to({ height: headerOffsetHeight }, { cancelable: false, duration }).finished;
    }
    for (let cntr = header.children.length; --cntr >= 0; ) {
      let className = header.children[cntr]?.className;
      className = className?.baseVal ?? className;
      if (typeof className !== "string" || className.includes("window-title") || className.includes("close")) {
        continue;
      }
      if (className.includes("keep-minimized")) {
        header.children[cntr].style.display = "block";
        continue;
      }
      header.children[cntr].style.display = "none";
    }
    if (animate) {
      await this.position.animate.to({ width: _SvelteApp.#MIN_WINDOW_WIDTH }, {
        cancelable: false,
        duration: 0.1
      }).finished;
    }
    element2.classList.add("minimized");
    this._minimized = true;
  }
  /**
   * Provides a callback after all Svelte components are initialized.
   */
  onSvelteMount() {
  }
  // eslint-disable-line no-unused-vars
  /**
   * Provides a callback after the main application shell is remounted. This may occur during HMR / hot module
   * replacement or directly invoked from the `elementRootUpdate` callback passed to the application shell component
   * context.
   */
  onSvelteRemount() {
  }
  // eslint-disable-line no-unused-vars
  /**
   * Override replacing HTML as Svelte components control the rendering process. Only potentially change the outer
   * application frame / title for pop-out applications.
   *
   * @protected
   * @ignore
   * @internal
   */
  _replaceHTML(element2, html) {
    if (!element2.length) {
      return;
    }
    this.reactive.updateHeaderButtons();
  }
  /**
   * Provides an override verifying that a new Application being rendered for the first time doesn't have a
   * corresponding DOM element already loaded. This is a check that only occurs when `this._state` is
   * `Application.RENDER_STATES.NONE`. It is useful in particular when SvelteApp has a static ID
   * explicitly set in `this.options.id` and long intro / outro transitions are assigned. If a new application
   * sharing this static ID attempts to open / render for the first time while an existing DOM element sharing
   * this static ID exists then the initial render is cancelled below rather than crashing later in the render
   * cycle {@link TJSPosition.set}.
   *
   * @protected
   * @ignore
   * @internal
   */
  async _render(force = false, options = {}) {
    if (isObject(options?.focusSource)) {
      this.options.focusSource = options.focusSource;
    }
    const activeWindow = this.reactive.activeWindow;
    try {
      if (this._state === Application.RENDER_STATES.NONE && A11yHelper.isFocusTarget(activeWindow.document.querySelector(`#${this.id}`))) {
        console.warn(`SvelteApp - _render: A DOM element already exists for CSS ID '${this.id}'. Cancelling initial render for new application with appId '${this.appId}'.`);
        return;
      }
    } catch (err) {
      console.warn(`SvelteApp - _render: Potentially malformed application ID '${this.id}'. Cancelling initial render for new application with appId '${this.appId}'.`);
      return;
    }
    this.#gateSetPosition = true;
    await super._render(force, options);
    this.#gateSetPosition = false;
    if ([Application.RENDER_STATES.CLOSING, Application.RENDER_STATES.RENDERING].includes(this._state)) {
      return;
    }
    if (!force && this._state <= Application.RENDER_STATES.NONE) {
      return;
    }
    if (!this._minimized) {
      this.#position.set({
        left: typeof this.options?.left === "string" ? this.options.left : void 0,
        height: typeof this.options?.height === "string" ? this.options.height : void 0,
        maxHeight: typeof this.options?.maxHeight === "string" ? this.options.maxHeight : void 0,
        maxWidth: typeof this.options?.maxWidth === "string" ? this.options.maxWidth : void 0,
        minHeight: typeof this.options?.minHeight === "string" ? this.options.minHeight : void 0,
        minWidth: typeof this.options?.minWidth === "string" ? this.options.minWidth : void 0,
        rotateX: typeof this.options?.rotateX === "string" ? this.options.rotateX : void 0,
        rotateY: typeof this.options?.rotateY === "string" ? this.options.rotateY : void 0,
        rotateZ: typeof this.options?.rotateZ === "string" ? this.options.rotateZ : void 0,
        rotation: typeof this.options?.rotation === "string" ? this.options.rotation : void 0,
        top: typeof this.options?.top === "string" ? this.options.top : void 0,
        width: typeof this.options?.width === "string" ? this.options.width : void 0,
        ...options
      });
    }
    if (!this.#onMount) {
      this.#onMount = true;
      TJSAppIndex.add(this);
      if (typeof this.options.alwaysOnTop === "boolean" && this.options.alwaysOnTop) {
        handleAlwaysOnTop(this, true);
      }
      nextAnimationFrame().then(() => this.onSvelteMount());
    }
  }
  /**
   * Render the inner application content. Provide an empty JQuery element per the core Foundry API.
   *
   * @protected
   * @ignore
   * @internal
   */
  async _renderInner() {
    const activeWindow = this.reactive.activeWindow;
    const html = activeWindow.document.createDocumentFragment();
    return $(html);
  }
  /**
   * Stores the initial z-index set in `_renderOuter` which is used in `_injectHTML` to set the target element
   * z-index after the Svelte component is mounted.
   *
   * @protected
   * @ignore
   * @internal
   */
  async _renderOuter() {
    const html = await super._renderOuter();
    this.#initialZIndex = html[0].style.zIndex;
    return html;
  }
  /**
   * All calculation and updates of position are implemented in {@link TJSPosition.set}.
   * This allows position to be fully reactive and in control of updating inline styles for the application.
   *
   * This method remains for backward compatibility with Foundry. If you have a custom override quite likely you need
   * to update to using the {@link TJSPosition.validators} / ValidatorAPI functionality.
   *
   * @param {TJSPosition.API.Data.TJSPositionDataRelative}   [position] - TJSPosition data.
   *
   * @returns {TJSPosition} The updated position object for the application containing the new values.
   * @ignore
   */
  setPosition(position) {
    return !this.#gateSetPosition ? this.position.set(position) : this.position;
  }
  /**
   * This method is invoked by the `elementRootUpdate` callback that is added to the external context passed to
   * Svelte components. When invoked it updates the local element roots tracked by SvelteApp.
   *
   * This method may also be invoked by HMR / hot module replacement via `svelte-hmr`.
   */
  #updateApplicationShell() {
    const applicationShell = this.svelte.appShell;
    if (applicationShell !== null) {
      this._element = $(applicationShell.elementRoot);
      this.#elementContent = hasGetter(applicationShell, "elementContent") ? applicationShell.elementContent : null;
      this.#elementTarget = hasGetter(applicationShell, "elementTarget") ? applicationShell.elementTarget : null;
      if (this.#elementTarget === null) {
        this.#elementTarget = typeof this.options.selectorTarget === "string" ? this._element[0].querySelector(this.options.selectorTarget) : this._element[0];
      }
      if (typeof this.options.positionable === "boolean" && this.options.positionable) {
        this.#elementTarget.style.zIndex = typeof this.options.zIndex === "number" ? this.options.zIndex : this.#initialZIndex ?? 95;
        super.bringToTop();
        this.position.set(this.position.get());
      }
      super._activateCoreListeners([this.popOut ? this.#elementTarget?.firstChild : this.#elementTarget]);
      if (typeof this.options.alwaysOnTop === "boolean" && this.options.alwaysOnTop) {
        handleAlwaysOnTop(this, true);
      }
      nextAnimationFrame().then(() => this.onSvelteRemount());
    }
  }
};
var PopoutSupport = class {
  static initialize() {
    Hooks.on("PopOut:loading", (app, popout) => {
      if (app instanceof SvelteApp) {
        app.position.enabled = false;
        app.state.save({
          name: "#beforePopout",
          headerButtonNoClose: app.reactive.headerButtonNoClose
        });
        app.reactive.activeWindow = popout;
        app.reactive.headerButtonNoClose = true;
      }
    });
    Hooks.on("PopOut:popin", (app) => this.#handleRejoin(app));
    Hooks.on("PopOut:close", (app) => this.#handleRejoin(app));
  }
  /**
   * Handles rejoining the app to main browser window.
   *
   * @param {Application} app - The target app.
   */
  static #handleRejoin(app) {
    if (app instanceof SvelteApp) {
      app.position.enabled = true;
      const beforeData = app.state.remove({ name: "#beforePopout" });
      if (beforeData) {
        app.reactive.headerButtonNoClose = beforeData?.headerButtonNoClose ?? false;
      }
      app.reactive.activeWindow = void 0;
    }
  }
};
var ThemeObserver = class {
  /**
   * All readable theme stores.
   *
   * @type {Readonly<({
   *    theme: Readonly<import('#svelte/store').Readable<'theme-dark' | 'theme-light'>>,
   *    themeDark: Readonly<import('#svelte/store').Readable<boolean>>,
   *    themeLight: Readonly<import('#svelte/store').Readable<boolean>>,
   * })>}
   */
  static #stores;
  /**
   * Internal setter for theme stores.
   *
   * @type {({
   *    theme: Function,
   *    themeDark: Function,
   *    themeLight: Function,
   * })}
   */
  static #storeSet;
  /**
   * Current theme.
   *
   * @type {string}
   */
  static #theme = "";
  /**
   * @returns {Readonly<({
   *    theme: Readonly<import('#svelte/store').Readable<'theme-dark' | 'theme-light'>>,
   *    themeDark: Readonly<import('#svelte/store').Readable<boolean>>,
   *    themeLight: Readonly<import('#svelte/store').Readable<boolean>>,
   * })>} Current core theme stores.
   */
  static get stores() {
    return this.#stores;
  }
  /**
   * @returns {'theme-dark' | 'theme-light'} Current core theme.
   */
  static get theme() {
    return this.#theme;
  }
  /**
   * @returns {boolean} Is the core theme `dark`.
   */
  static get themeDark() {
    return this.#theme === "theme-dark";
  }
  /**
   * @returns {boolean} Is the core theme `light`.
   */
  static get themeLight() {
    return this.#theme === "theme-light";
  }
  /**
   * Helper to apply current core theme to a given SvelteApp optional classes.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/application').SvelteApp} application - Svelte application.
   *
   * @param {object} [options] - Options.
   *
   * @param {boolean} [options.hasThemed] - Verify that the original application default options contains the `themed`
   *        class otherwise do not add the core theme classes.
   *
   * @returns {string} App classes CSS string with current core theme applied.
   */
  static appClasses(application, { hasThemed = false } = {}) {
    const classes = /* @__PURE__ */ new Set([
      ...Array.isArray(application?.options?.classes) ? application.options.classes : []
    ]);
    classes.delete("themed");
    classes.delete("theme-light");
    const origOptions = application.constructor.defaultOptions;
    const themeExplicit = this.#hasExplicitTheme(origOptions?.classes);
    if (!hasThemed) {
      classes.add("themed");
      classes.add(themeExplicit ?? this.#theme);
    } else {
      if (origOptions?.classes?.includes("themed") || themeExplicit) {
        classes.add("themed");
        classes.add(themeExplicit ?? this.#theme);
      }
    }
    return Array.from(classes).join(" ");
  }
  /**
   * Initialize `document.body` theme observation.
   */
  static initialize() {
    if (this.#stores !== void 0) {
      return;
    }
    const themeStore = writable(this.#theme);
    const themeDarkStore = writable(false);
    const themeLightStore = writable(false);
    this.#stores = Object.freeze({
      theme: Object.freeze({ subscribe: themeStore.subscribe }),
      themeDark: Object.freeze({ subscribe: themeDarkStore.subscribe }),
      themeLight: Object.freeze({ subscribe: themeLightStore.subscribe })
    });
    this.#storeSet = {
      theme: themeStore.set,
      themeDark: themeDarkStore.set,
      themeLight: themeLightStore.set
    };
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains("theme-light")) {
        this.#theme = "theme-light";
        this.#storeSet.themeDark(false);
        this.#storeSet.themeLight(true);
      } else if (document.body.classList.contains("theme-dark")) {
        this.#theme = "theme-dark";
        this.#storeSet.themeDark(true);
        this.#storeSet.themeLight(false);
      }
      this.#storeSet.theme(this.#theme);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * @param {string[]} classes - Original application classes.
   *
   * @returns {undefined | string} Undefined if no explicit theme is specified otherwise the explicitly `theme-<XXX>`
   *          class string.
   */
  static #hasExplicitTheme(classes) {
    if (!Array.isArray(classes)) {
      return void 0;
    }
    let result = void 0;
    for (const entry of classes) {
      if (typeof entry !== "string") {
        continue;
      }
      if (entry.startsWith("theme-")) {
        result = entry;
        break;
      }
    }
    return result;
  }
};
var SvelteAppData = class {
  static #initialized = false;
  /**
   * @returns {number} Version number for SvelteAppData.
   */
  static get VERSION() {
    return 1;
  }
  static get alwaysOnTop() {
    return AlwaysOnTop;
  }
  static initialize() {
    if (this.#initialized) {
      return;
    }
    this.#initialized = true;
    const currentVersion = globalThis?.TRL_SVELTE_APP_DATA?.VERSION;
    if (typeof currentVersion !== "number" || currentVersion < this.VERSION) {
      globalThis.TRL_SVELTE_APP_DATA = this;
    }
  }
};
var AlwaysOnTop = class {
  /**
   * Stores the max z-index.
   *
   * @type {number}
   */
  static #max = 2 ** 31 - 1e3;
  /**
   * Stores the min z-index.
   *
   * @type {number}
   */
  static #min = 2 ** 31 - 1e5;
  /**
   * Stores the current z-index for the top most `alwaysOnTop` app.
   *
   * @type {number}
   */
  static #current = this.#min;
  /**
   * @returns {number} Increments the current always on top z-index and returns it.
   */
  static getAndIncrement() {
    this.#current = Math.min(++this.#current, this.#max);
    return this.#current;
  }
  static get current() {
    return this.#current;
  }
  static get max() {
    return this.#max;
  }
  static get min() {
    return this.#min;
  }
};
var TJSDialogData = class {
  /**
   * @type {import('../../index.js').SvelteApp}
   */
  #application;
  /**
   * Stores the dialog options data.
   *
   * @type {import('./types').TJSDialog.OptionsData}
   */
  #internal = {};
  /**
   * @param {import('../../index.js').SvelteApp} application - The host Foundry application.
   */
  constructor(application) {
    this.#application = application;
    Object.seal(this);
  }
  /**
   * @returns {{ [key: string]: import('./types').TJSDialogButtonData }} The dialog button configuration.
   */
  get buttons() {
    return this.#internal.buttons;
  }
  /**
   * Set the dialog button configuration.
   *
   * @param {{ [key: string]: import('./types').TJSDialogButtonData }} buttons - New dialog button configuration.
   */
  set buttons(buttons) {
    this.#internal.buttons = buttons;
    this.#updateComponent();
  }
  /**
   * @returns {import('@typhonjs-fvtt/runtime/svelte/util').TJSSvelte.Config.Embed | string} The Svelte configuration object or
   *          HTML string content.
   */
  get content() {
    return this.#internal.content;
  }
  /**
   * Set the Svelte configuration object or HTML string content.
   *
   * @param {import('@typhonjs-fvtt/runtime/svelte/util').TJSSvelte.Config.Embed | string} content - New Svelte configuration
   *        object or HTML string content.
   */
  set content(content) {
    this.#internal.content = content;
    this.#updateComponent();
  }
  /**
   * @returns {string} The default button ID to focus initially.
   */
  get default() {
    return this.#internal.default;
  }
  /**
   * Set the default button ID to focus initially.
   *
   * @param {string} newDefault - New default button ID to focus initially.
   */
  set default(newDefault) {
    this.#internal.default = newDefault;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} The dialog always on top state.
   */
  get alwaysOnTop() {
    return this.#internal.alwaysOnTop;
  }
  /**
   * Set the dialog always on top state.
   *
   * @param {boolean} alwaysOnTop - New dialog always on top state.
   */
  set alwaysOnTop(alwaysOnTop) {
    this.#internal.alwaysOnTop = alwaysOnTop;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} The dialog draggable state; draggable when true.
   */
  get draggable() {
    return this.#internal.draggable;
  }
  /**
   * Set the dialog state; draggable when true.
   *
   * @param {boolean} draggable - New dialog draggable state; draggable when true.
   */
  set draggable(draggable2) {
    this.#internal.draggable = draggable2;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true auto-management of app focus is enabled.
   */
  get focusAuto() {
    return this.#internal.focusAuto;
  }
  /**
   * Set the dialog auto-management of app focus.
   *
   * @param {boolean} focusAuto - New dialog auto-management of app focus.
   */
  set focusAuto(focusAuto) {
    this.#internal.focusAuto = focusAuto;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true the first focusable element that isn't a button is focused.
   */
  get focusFirst() {
    return this.#internal.focusFirst;
  }
  /**
   * Set the dialog first focusable element state.
   *
   * @param {boolean} focusFirst - New dialog first focusable element state.
   */
  set focusFirst(focusFirst) {
    this.#internal.focusFirst = focusFirst;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When `focusAuto` and `focusKeep` is true; keeps internal focus.
   */
  get focusKeep() {
    return this.#internal.focusKeep;
  }
  /**
   * Set the dialog `focusKeep` state. When `focusAuto` and `focusKeep` is true; keeps internal focus.
   *
   * @param {boolean} focusKeep - New dialog `focusKeep` state.
   */
  set focusKeep(focusKeep) {
    this.#internal.focusKeep = focusKeep;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true the dialog is minimizable.
   */
  get minimizable() {
    return this.#internal.minimizable;
  }
  /**
   * Set the dialog `minimizable` state. When true the dialog is minimizable.
   *
   * @param {boolean} minimizable - New dialog `minimizable` state.
   */
  set minimizable(minimizable) {
    this.#internal.minimizable = minimizable;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true a modal dialog is displayed.
   */
  get modal() {
    return this.#internal.modal;
  }
  /**
   * Set the dialog `modal` state. When true a modal dialog is displayed.
   *
   * @param {boolean} modal - New dialog `modal` state.
   */
  set modal(modal) {
    this.#internal.modal = modal;
    this.#updateComponent();
  }
  /**
   * @returns {import('./types').TJSDialog.OptionsModal} Additional options for modal dialog display.
   */
  get modalOptions() {
    return this.#internal.modalOptions;
  }
  /**
   * Set additional options for modal dialog display.
   *
   * @param {import('./types').TJSDialog.OptionsModal} modalOptions - New additional options for modal dialog display.
   */
  set modalOptions(modalOptions) {
    this.#internal.modalOptions = modalOptions;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true and an error is raised in dialog callback functions post a UI error notification.
   */
  get notifyError() {
    return this.#internal.notifyError;
  }
  /**
   * Set the dialog `notifyError` state. When true and an error is raised in dialog callback functions post a UI error
   * notification.
   *
   * @param {boolean} notifyError - New dialog `notifyError` state.
   */
  set notifyError(notifyError) {
    this.#internal.notifyError = notifyError;
    this.#updateComponent();
  }
  /**
   * @returns {string | ((data?: { application?: import('../../index.js').TJSDialog }) => any)} Callback invoked when
   *          dialog is closed; no button option selected. When defined as a string any matching function by name
   *          exported from content Svelte component is invoked.
   */
  get onClose() {
    return this.#internal.onClose;
  }
  /**
   * Set callback invoked when dialog is closed; no button option selected. When defined as a string any matching
   * function by name exported from content Svelte component is invoked..
   *
   * @param {string | ((data?: { application?: import('../../index.js').TJSDialog }) => any)} onClose - New dialog
   *        `onClose` state.
   */
  set onClose(onClose) {
    this.#internal.onClose = onClose;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} Dialog `rejectClose` state. When true and a Promise has been created by {@link TJSDialog.wait}
   *          and the Promise is not in the process of being resolved or rejected on close of the dialog any `onClose`
   *          function is invoked and any result that is undefined will cause the Promise to then be rejected..
   */
  get rejectClose() {
    return this.#internal.rejectClose;
  }
  /**
   * Set the dialog `rejectClose` state.
   *
   * @param {boolean} rejectClose - New dialog `rejectClose` state.
   */
  set rejectClose(rejectClose) {
    this.#internal.rejectClose = rejectClose;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true the dialog is resizable.
   */
  get resizable() {
    return this.#internal.resizable;
  }
  /**
   * Set the dialog `resizable` state. When true the dialog is resizable.
   *
   * @param {boolean} resizable - New dialog `resizable` state.
   */
  set resizable(resizable) {
    this.#internal.resizable = resizable;
    this.#updateComponent();
  }
  /**
   * @returns {boolean} When true and resolving any Promises and there are undefined results from any button callbacks
   *          the button ID is resolved.
   */
  get resolveId() {
    return this.#internal.resolveId;
  }
  /**
   * Set the dialog `resolveId` state. When true and resolving any Promises and there are undefined results from any
   * button callbacks the button ID is resolved.
   *
   * @param {boolean} resolveId - New dialog `resolveId` state.
   */
  set resolveId(resolveId) {
    this.#internal.resolveId = resolveId;
    this.#updateComponent();
  }
  /**
   * @returns {string} The dialog window title.
   */
  get title() {
    return this.#internal.title;
  }
  /**
   * Set the dialog window title.
   *
   * @param {string} title - New dialog window title.
   */
  set title(title) {
    this.#internal.title = title;
    this.#updateComponent();
  }
  /**
   * @returns {import('./types').TJSDialog.OptionsTransition} Transition options for the dialog.
   */
  get transition() {
    return this.#internal.transition;
  }
  /**
   * Set transition options for the dialog.
   *
   * @param {import('./types').TJSDialog.OptionsTransition} transition - New transition options for the dialog.
   */
  set transition(transition) {
    this.#internal.transition = transition;
    this.#updateComponent();
  }
  /**
   * @returns {number | null} A specific z-index for the dialog. Pass null for the dialog to act like other
   *          applications in regard bringing to top when activated.
   */
  get zIndex() {
    return this.#internal.zIndex;
  }
  /**
   * Set specific z-index for the dialog.
   *
   * @param {number | null} zIndex - New z-index for the dialog.
   */
  set zIndex(zIndex) {
    this.#internal.zIndex = zIndex;
    this.#updateComponent();
  }
  /**
   * Provides a cloned copy of the dialog data.
   * Note: The content attribute is not cloned as complex / props may be present.
   *
   * @returns {import('./types').TJSDialog.OptionsData} A clone of the dialog data.
   */
  clone() {
    const shallowCopy = { ...this.#internal };
    delete shallowCopy.content;
    const cData = klona(shallowCopy);
    cData.content = this.#internal.content;
    return cData;
  }
  /**
   * Provides a way to safely get this dialogs data given an accessor string which describes the
   * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
   * to walk.
   *
   * @param {string}   accessor - The path / key to set. You can set multiple levels.
   *
   * @param {any}      [defaultValue] - A default value returned if the accessor is not found.
   *
   * @returns {any} Value at the accessor.
   */
  get(accessor, defaultValue) {
    return safeAccess(this.#internal, accessor, defaultValue);
  }
  /**
   * @param {import('./types').TJSDialog.OptionsData} data - Merge provided data object into Dialog data.
   */
  merge(data) {
    deepMerge(this.#internal, data);
    this.#updateComponent();
  }
  /**
   * Sets the dialog data; this is reactive.
   *
   * @param {import('./types').TJSDialog.OptionsData}   data - Dialog data.
   */
  replace(data) {
    if (!isObject(data)) {
      throw new TypeError(`TJSDialogData replace error: 'data' is not an object'.`);
    }
    this.#internal = {};
    this.merge(data);
  }
  /**
   * Provides a way to safely set this dialogs data given an accessor string which describes the
   * entries to walk. To access deeper entries into the object format the accessor string with `.` between entries
   * to walk.
   *
   * Automatically the dialog data will be updated in the associated DialogShell Svelte component.
   *
   * @param {string}   accessor - The path / key to set. You can set multiple levels.
   *
   * @param {any}      value - Value to set.
   *
   * @returns {boolean} True if successful.
   */
  set(accessor, value) {
    const success = safeSet(this.#internal, accessor, value, { createMissing: true });
    if (success) {
      this.#updateComponent();
    }
    return success;
  }
  /**
   * Updates the data in the Svelte dialog component.
   */
  #updateComponent() {
    const component = this.#application.svelte.appShell;
    if (component?.data) {
      component.data = this.clone();
    }
  }
};
var TJSDialog = class _TJSDialog extends SvelteApp {
  /** @type {TJSDialogData} */
  #data;
  /** @type {ManagedPromise} */
  #managedPromise;
  /**
   * @param {import('./internal/state-dialog/types').TJSDialog.OptionsData} data - Dialog options.
   *
   * @param {import('./types').SvelteApp.OptionsCore}   [options] - SvelteApp options.
   */
  constructor(data, options = {}) {
    super({
      popOutModuleDisable: typeof data?.modal === "boolean" ? data.modal : false,
      ...options,
      // Always ensure adding `dialog` class for core styles.
      classes: Array.isArray(options.classes) ? [...options.classes, "dialog"] : ["dialog"]
    });
    this.#managedPromise = new ManagedPromise();
    this.#data = new TJSDialogData(this);
    this.#data.replace(data);
  }
  /**
   * Default options for TJSDialog. Provides a default width and setting `height` to `auto` to always display dialog
   * content even if it changes. The default `DialogShell` / `svelte` options should not be changed and instead mount
   * the dialog content component by supplying a Svelte configuration object to dialog data `content` field.
   *
   * @returns {import('./types').SvelteApp.Options} Default options
   */
  static get defaultOptions() {
    return (
      /** @type {import('./types').SvelteApp.Options} */
      deepMerge(super.defaultOptions, {
        classes: ["dialog", "tjs-dialog"],
        width: 400,
        height: "auto",
        svelte: {
          class: DialogShell_default,
          intro: true,
          target: document.body,
          /**
           * `this` is the TJSDialog instance when invoked.
           *
           * @this {TJSDialog}
           *
           * @returns {{data: import('./types').TJSDialog.OptionsData, managedPromise: ManagedPromise}} Props
           */
          props: function() {
            return {
              data: this.#data.clone(),
              managedPromise: this.#managedPromise
            };
          }
        }
      })
    );
  }
  /**
   * Returns the dialog data.
   *
   * @returns {import('./internal/state-dialog/types').TJSDialog.Data} Dialog data.
   */
  get data() {
    return this.#data;
  }
  /**
   * @returns {import('@typhonjs-fvtt/runtime/util/async').ManagedPromise} Returns the managed promise.
   */
  get managedPromise() {
    return this.#managedPromise;
  }
  /**
   * Close the dialog and un-register references to it within UI mappings.
   * This function returns a Promise which resolves once the window closing animation concludes.
   *
   * @param {object}   [options] - Optional parameters.
   *
   * @param {boolean}  [options.force] - Force close regardless of render state.
   *
   * @returns {Promise<void>} A Promise which resolves once the application is closed with the callback value or
   *                          `true`.
   */
  async close(options) {
    try {
      if (this.#managedPromise.isActive && !this.#managedPromise.isProcessing) {
        const result = _TJSDialog.#invokeFn(this.#data.onClose, this, null);
        const rejectClose = typeof this.#data.rejectClose === "boolean" ? this.#data.rejectClose : false;
        if (rejectClose && result === null) {
          this.#managedPromise.reject(new Error("TJSDialog was closed without a choice being made."));
        } else {
          this.#managedPromise.resolve(result);
        }
      }
    } catch (err) {
      const notifyError = typeof this.#data.notifyError === "boolean" ? this.#data.notifyError : true;
      if (notifyError) {
        globalThis.ui.notifications.error(err, { console: false });
      }
      if (!this.#managedPromise.reject(err)) {
        throw err;
      }
    } finally {
      await super.close(options);
    }
  }
  /**
   * Brings to top or renders this dialog returning a Promise that is resolved any button pressed or when the dialog
   * is closed.
   *
   * Creates an anonymous data defined TJSDialog returning a Promise that can be awaited upon for the user to make a
   * choice.
   *
   * Note: `null` is returned if the dialog is closed without a user making a choice.
   *
   * @template T
   *
   * @param {object}   [options] - Options.
   *
   * @param {boolean}  [options.reuse=false] - When true if there is an existing managed Promise this allows multiple
   *        sources to await on the same result.
   *
   * @returns {Promise<T>} A promise for dialog resolution.
   */
  async wait(options) {
    if (this.rendered) {
      this.bringToTop();
    } else {
      this.render(true, { focus: true });
    }
    return this.#managedPromise.create(options);
  }
  // ---------------------------------------------------------------------------------------------------------------
  /**
   * A helper factory method to create simple confirmation dialog windows which consist of simple yes / no prompts.
   * If you require more flexibility, a custom TJSDialog instance is preferred. The default focused button is 'yes'.
   * You can change the default focused button by setting `default` to `yes` or `no`.
   *
   * @template T
   *
   * @param {import('./internal/state-dialog/types').TJSDialog.OptionsData & {
   *    onYes?: string | ((data?: { application?: TJSDialog }) => any),
   *    onNo?: string | ((data?: { application?: TJSDialog }) => any)
   * }} [data] - Confirm dialog options.
   *
   * @param {string|((data?: { application?: TJSDialog }) => any)} [data.onYes] - Callback function upon `yes`; may be
   *        an async function. When defined as a string any matching function by name exported from content Svelte
   *        component is invoked.
   *
   * @param {string|((data?: { application?: TJSDialog }) => any)} [data.onNo] - Callback function upon `no`; may be an
   *        async function. When defined as a string any matching function by name exported from content Svelte
   *        component is invoked.
   *
   * @param {import('./types').SvelteApp.OptionsCore}  [options]  SvelteApp options passed to the
   *        TJSDialog constructor.
   *
   * @returns {Promise<T>} A promise which resolves with result of yes / no callbacks or true / false.
   *
   * @example
   * const result = await TJSDialog.confirm({
   *  title: 'A Yes or No Question',
   *  content: '<p>Choose wisely.</p>',
   *  onYes: () => 'YES Result',
   *  onNo: () => 'NO Result'
   * });
   *
   * // Logs 'YES result', 'NO Result', or null if the user closed the dialog without making a selection.
   * console.log(result);
   */
  static async confirm({ onYes, onNo, ...data } = {}, options = {}) {
    const mergedButtons = deepMerge({
      yes: {
        icon: "fas fa-check",
        label: "Yes"
      },
      no: {
        icon: "fas fa-times",
        label: "No"
      }
    }, data.buttons ?? {});
    return this.wait({
      ...data,
      buttons: deepMerge(mergedButtons, {
        yes: {
          onPress: ({ application }) => this.#invokeFn(onYes, application, true)
        },
        no: {
          onPress: ({ application }) => this.#invokeFn(onNo, application, false)
        }
      }),
      default: data.default ?? "yes"
    }, options);
  }
  /**
   * A helper method to invoke a callback function directly or lookup an exported function with the same name from any
   * content Svelte component to invoke. This is used internally to apply default values for `confirm` and `prompt`.
   *
   * @param {string|((data?: { application?: TJSDialog }) => any)} callback - Callback function to invoke; may be an
   *        async function. When defined as a string any matching function by name exported from content Svelte
   *        component is invoked.
   *
   * @param {TJSDialog} application - TJSDialog instance passed to callback.
   *
   * @param {*} [defaultResult] - An optional default result to return; undefined if not specified.
   *
   * @returns {*} Result.
   *
   * @internal
   */
  static #invokeFn(callback, application, defaultResult = void 0) {
    let result = defaultResult;
    switch (typeof callback) {
      case "function":
        result = callback({ application });
        break;
      case "string": {
        const dialogComponent = application?.svelte?.appShell?.dialogComponent;
        if (dialogComponent !== void 0 && typeof dialogComponent?.[callback] === "function") {
          result = dialogComponent?.[callback]({ application });
        } else {
          if (dialogComponent === void 0) {
            console.warn(`[TRL] TJSDialog warning: 'onPress' defined as a string with no associated content Svelte component.`);
          } else if (typeof dialogComponent?.[callback] !== "function") {
            console.warn(`[TRL] TJSDialog warning: The content Svelte component does not contain an associated function '${callback}'. Did you remember to add '<svelte:options accessors={true} />' and export the function?`);
          }
        }
        break;
      }
    }
    return result;
  }
  /**
   * A helper factory method to display a basic "prompt" style TJSDialog with a single button.
   *
   * @template T
   *
   * @param {import('./internal/state-dialog/types').TJSDialog.OptionsData & {
   *    onOk?: string | ((data?: { application?: TJSDialog }) => any),
   *    label?: string,
   *    icon?: string
   * }} [data] - Prompt dialog options that includes any TJSDialog options along with the following optional fields:
   *
   * @param {string|((data?: { application?: TJSDialog }) => any)} [data.onOk] - Callback function upon `ok`; may be
   *        an async function. When defined as a string any matching function by name exported from content Svelte
   *        component is invoked.
   *
   * @param {string}   [data.label] - The OK prompt button text.
   *
   * @param {string}   [data.icon="fas fa-check"] - Set another icon besides `fas fa-check` for button.
   *
   * @param {import('./types').SvelteApp.OptionsCore}  [options]  SvelteApp options passed to the
   *        TJSDialog constructor.
   *
   * @returns {Promise<T>} The returned value from the provided callback function or `true` if the button
   *          is pressed.
   *
   * @example
   * const result = await TJSDialog.prompt({
   *  title: 'Are you OK?',
   *  content: '<p>Are you OK?.</p>',
   *  label: 'Feeling Fine!',
   *  onOk: () => 'OK'
   * });
   *
   * // Logs 'OK' or null if the user closed the dialog without making a selection.
   * console.log(result);
   */
  static async prompt({ onOk, label, icon = "fas fa-check", ...data } = {}, options = {}) {
    return this.wait({
      ...data,
      buttons: {
        ok: {
          icon,
          label,
          onPress: ({ application }) => this.#invokeFn(onOk, application, true)
        }
      },
      default: "ok"
    }, options);
  }
  /**
   * Creates an anonymous data defined TJSDialog returning a Promise that can be awaited upon for the user to make a
   * choice.
   *
   * Note: By default `null` is returned if the dialog is closed without a user making a choice.
   *
   * @template T
   *
   * @param {import('./internal/state-dialog/types').TJSDialog.OptionsData}  data - Dialog data passed to the
   *        TJSDialog constructor.
   *
   * @param {import('./types').SvelteApp.OptionsCore}  [options]  SvelteApp options passed to the
   *        TJSDialog constructor.
   *
   * @returns {Promise<T>} A Promise that resolves to the chosen result.
   */
  static async wait(data, options = {}) {
    if (!isObject(data)) {
      throw new TypeError(`TJSDialog.wait error: 'data' is not an object'.`);
    }
    return new this({ ...data }, options).wait();
  }
};
SvelteAppData.initialize();
ThemeObserver.initialize();
if (import.meta.hot) {
  FoundryHMRSupport.initialize();
}
PopoutSupport.initialize();

// node_modules/@typhonjs-fvtt/runtime/_dist/util/path/index.js
function getRoutePrefix(url) {
  return globalThis.foundry.utils.getRoute(url);
}

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/data/cursorCSSVariables.js
var cursorCSSVariables = {
  "--tjs-cursor-all-scroll": "all-scroll",
  "--tjs-cursor-all-scroll-down": "all-scroll",
  "--tjs-cursor-alias": "alias",
  "--tjs-cursor-alias-down": "alias",
  "--tjs-cursor-cell": "cell",
  "--tjs-cursor-cell-down": "cell",
  "--tjs-cursor-copy": "copy",
  "--tjs-cursor-copy-down": "copy",
  "--tjs-cursor-context-menu": "context-menu",
  "--tjs-cursor-context-menu-down": "context-menu",
  "--tjs-cursor-crosshair": "crosshair",
  "--tjs-cursor-crosshair-down": "crosshair",
  "--tjs-cursor-default": "default",
  "--tjs-cursor-default-down": "default",
  "--tjs-cursor-grab": "grab",
  "--tjs-cursor-grab-down": "var(--tjs-cursor-grabbing, grabbing)",
  "--tjs-cursor-grabbing": "grabbing",
  "--tjs-cursor-grabbing-down": "grabbing",
  "--tjs-cursor-help": "help",
  "--tjs-cursor-help-down": "help",
  "--tjs-cursor-pointer": "pointer",
  "--tjs-cursor-pointer-down": "pointer",
  "--tjs-cursor-move": "move",
  "--tjs-cursor-move-down": "move",
  "--tjs-cursor-no-drop": "no-drop",
  "--tjs-cursor-no-drop-down": "no-drop",
  "--tjs-cursor-not-allowed": "not-allowed",
  "--tjs-cursor-not-allowed-down": "not-allowed",
  "--tjs-cursor-progress": "progress",
  "--tjs-cursor-progress-down": "progress",
  "--tjs-cursor-resize-col": "col-resize",
  "--tjs-cursor-resize-col-down": "col-resize",
  "--tjs-cursor-resize-e": "e-resize",
  "--tjs-cursor-resize-e-down": "e-resize",
  "--tjs-cursor-resize-ew": "ew-resize",
  "--tjs-cursor-resize-ew-down": "ew-resize",
  "--tjs-cursor-resize-n": "n-resize",
  "--tjs-cursor-resize-n-down": "n-resize",
  "--tjs-cursor-resize-ne": "ne-resize",
  "--tjs-cursor-resize-ne-down": "ne-resize",
  "--tjs-cursor-resize-nesw": "nesw-resize",
  "--tjs-cursor-resize-nesw-down": "nesw-resize",
  "--tjs-cursor-resize-ns": "ns-resize",
  "--tjs-cursor-resize-ns-down": "ns-resize",
  "--tjs-cursor-resize-nw": "nw-resize",
  "--tjs-cursor-resize-nw-down": "nw-resize",
  "--tjs-cursor-resize-nwse": "nwse-resize",
  "--tjs-cursor-resize-nwse-down": "nwse-resize",
  "--tjs-cursor-resize-row": "row-resize",
  "--tjs-cursor-resize-row-down": "row-resize",
  "--tjs-cursor-resize-s": "s-resize",
  "--tjs-cursor-resize-s-down": "s-resize",
  "--tjs-cursor-resize-se": "se-resize",
  "--tjs-cursor-resize-se-down": "se-resize",
  "--tjs-cursor-resize-sw": "sw-resize",
  "--tjs-cursor-resize-sw-down": "sw-resize",
  "--tjs-cursor-resize-w": "w-resize",
  "--tjs-cursor-resize-w-down": "w-resize",
  "--tjs-cursor-text": "text",
  "--tjs-cursor-text-down": "text",
  "--tjs-cursor-text-vertical": "vertical-text",
  "--tjs-cursor-text-vertical-down": "vertical-text",
  "--tjs-cursor-wait": "wait",
  "--tjs-cursor-wait-down": "wait",
  "--tjs-cursor-zoom-in": "zoom-in",
  "--tjs-cursor-zoom-in-down": "zoom-in",
  "--tjs-cursor-zoom-out": "zoom-out",
  "--tjs-cursor-zoom-out-down": "zoom-out"
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/FVTTConfigure.js
var FVTTConfigure = class {
  static #initialized = false;
  static initialize() {
    if (this.#initialized) {
      return;
    }
    const manager = StyleManager.create({
      id: "__tjs-runtime-vars",
      version: "0.1.0",
      layerName: "variables.tjs-runtime-vars",
      rules: {
        themeDark: "body, .themed.theme-dark",
        themeLight: ".themed.theme-light"
      }
    });
    if (!manager?.isConnected) {
      this.#initialized = true;
      return;
    }
    this.#initialized = true;
    document?.["#__trl-root-styles"]?.remove?.();
    const themeDarkRoot = manager.get("themeDark");
    const themeLight = manager.get("themeLight");
    Hooks.once("ready", () => this.#setCoreInlineStyles(themeDarkRoot));
    themeDarkRoot.setProperties(cursorCSSVariables);
    const opts = { camelCase: true };
    {
      const propsApp = FoundryStyles.ext.get(".application", opts);
      const propsAppHeader = FoundryStyles.ext.get(".application .window-header", opts);
      const propsAppHeaderBtn = FoundryStyles.ext.get(".application .window-header button.header-control", opts);
      const propsAppHandle = FoundryStyles.ext.get(".application .window-resize-handle", opts);
      const propsAppHandleDark = FoundryStyles.ext.get(".themed.theme-dark.application .window-resize-handle", opts);
      themeDarkRoot.setProperties({
        // `:root` properties applying to all themes -------------------------------------------------------------------
        // For `TJSApplicationShell.svelte` app background.
        "--tjs-app-background": `url("${getRoutePrefix("/ui/denim075.png")}")`,
        // For `ResizeHandle.svelte` / the resize handle.
        "--tjs-app-resize-handle-background": propsAppHandle.background ?? "BAD",
        // '--tjs-app-resize-handle-background': propsAppHandle.background ??
        //  `transparent url("${getRoutePrefix('/ui/resize-handle.webp')}") no-repeat center / contain`,
        "--tjs-app-resize-handle-inset": propsAppHandle.inset ?? "auto 1px 1px auto",
        "--tjs-app-resize-handle-position": propsAppHandle.position ?? "absolute",
        "--tjs-app-resize-handle-height": propsAppHandle.height ?? "11x",
        "--tjs-app-resize-handle-width": propsAppHandle.width ?? "11px",
        "--tjs-app-font-size": propsApp.fontSize ?? "var(--font-size-14)",
        "--tjs-app-header-font-size": propsAppHeader.fontSize ?? "var(--font-size-13)",
        // For `TJSHeaderButton.svelte / core only provides one set of properties across themes.
        "--tjs-app-header-button-size": propsAppHeaderBtn["--button-size"] ?? "1.5rem",
        "--tjs-app-header-button-color": propsAppHeaderBtn["--button-text-color"] ?? "var(--color-light-1)",
        // Explicit dark theme properties ------------------------------------------------------------------------------
        // For `ApplicationShell.svelte`.
        "--tjs-app-header-background": propsAppHeader.background ?? "var(--color-header-background)",
        // For `ResizeHandle.svelte` / invert the resize handle.
        "--tjs-app-resize-handle-filter": propsAppHandleDark.filter ?? "invert(1)"
      });
    }
    {
      const propsAppHeader = FoundryStyles.ext.get(".application .window-header", {
        camelCase: true,
        resolve: "body.theme-light .application"
      });
      themeLight.setProperties({
        // For `ApplicationShell.svelte` / `EmptyApplicationShell.svelte`.
        "--tjs-app-header-background": propsAppHeader.background ?? "blue",
        // 'var(--color-dark-3)',
        // For `ResizeHandle.svelte` / cancel invert of the resize handle / there is no style to set.
        "--tjs-app-resize-handle-filter": "none"
      });
    }
  }
  /**
   * Sets any top level inline styles to TRL CSS variables defined in root `<html>` element by Foundry or game system
   * override.
   *
   * @param {import('@typhonjs-fvtt/runtime/util/dom/style').StyleManager.RuleManager}   ruleManager - Target rule manager.
   */
  static #setCoreInlineStyles(ruleManager) {
    const htmlStyles = StyleParse.cssText(document.documentElement.style.cssText);
    for (const key in htmlStyles) {
      if (key.startsWith("--cursor-")) {
        const tjsCursorKey = key.replace(/^--cursor-/, "--tjs-cursor-");
        if (ruleManager.hasProperty(tjsCursorKey)) {
          ruleManager.setProperty(tjsCursorKey, htmlStyles[key]);
        }
      }
    }
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/util/dom/observer/index.js
var ResizeObserverManager = class _ResizeObserverManager {
  /** @type {Map<HTMLElement, import('./types-local').ResizeObserverSubscriber[]>} */
  #elMap = /* @__PURE__ */ new Map();
  /** @type {ResizeObserver} */
  #resizeObserver;
  /**
   * Defines the various shape / update type of the given target.
   *
   * @type {{ [key: string]: number }}
   */
  static #updateTypes = Object.freeze({
    none: 0,
    attribute: 1,
    function: 2,
    resizeObserved: 3,
    setContentBounds: 4,
    setDimension: 5,
    storeObject: 6,
    storesObject: 7
  });
  constructor() {
    this.#resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const subscribers = this.#elMap.get(entry?.target);
        if (Array.isArray(subscribers)) {
          const contentWidth = entry.contentRect.width;
          const contentHeight = entry.contentRect.height;
          for (const subscriber of subscribers) {
            _ResizeObserverManager.#updateSubscriber(subscriber, contentWidth, contentHeight);
          }
        }
      }
    });
  }
  /**
   * Add an {@link HTMLElement} and {@link ResizeObserverData.ResizeTarget} instance for monitoring. Create cached
   * style attributes for the given element include border & padding dimensions for offset width / height calculations.
   *
   * @param {HTMLElement}    el - The element to observe.
   *
   * @param {import('./types').ResizeObserverData.ResizeTarget} target - A target that contains one of several
   *        mechanisms for updating resize data.
   */
  add(el, target) {
    if (!CrossWindow.isHTMLElement(el)) {
      throw new TypeError(`ResizeObserverManager.add error: 'el' is not a HTMLElement.`);
    }
    if (this.#hasTarget(el, target)) {
      return;
    }
    const updateType = _ResizeObserverManager.#getUpdateType(target);
    if (updateType === 0) {
      throw new Error(`ResizeObserverManager.add error: 'target' is not a valid ResizeObserverManager target.`);
    }
    const computed = globalThis.getComputedStyle(el);
    const borderBottom = StyleParse.pixels(el.style.borderBottom) ?? StyleParse.pixels(computed.borderBottom) ?? 0;
    const borderLeft = StyleParse.pixels(el.style.borderLeft) ?? StyleParse.pixels(computed.borderLeft) ?? 0;
    const borderRight = StyleParse.pixels(el.style.borderRight) ?? StyleParse.pixels(computed.borderRight) ?? 0;
    const borderTop = StyleParse.pixels(el.style.borderTop) ?? StyleParse.pixels(computed.borderTop) ?? 0;
    const paddingBottom = StyleParse.pixels(el.style.paddingBottom) ?? StyleParse.pixels(computed.paddingBottom) ?? 0;
    const paddingLeft = StyleParse.pixels(el.style.paddingLeft) ?? StyleParse.pixels(computed.paddingLeft) ?? 0;
    const paddingRight = StyleParse.pixels(el.style.paddingRight) ?? StyleParse.pixels(computed.paddingRight) ?? 0;
    const paddingTop = StyleParse.pixels(el.style.paddingTop) ?? StyleParse.pixels(computed.paddingTop) ?? 0;
    const data = {
      updateType,
      target,
      // Stores most recent contentRect.width and contentRect.height values from ResizeObserver.
      contentWidth: 0,
      contentHeight: 0,
      // Convenience data for total border & padding for offset width & height calculations.
      styles: {
        additionalWidth: borderLeft + borderRight + paddingLeft + paddingRight,
        additionalHeight: borderTop + borderBottom + paddingTop + paddingBottom
      }
    };
    if (this.#elMap.has(el)) {
      const subscribers = this.#elMap.get(el);
      subscribers.push(data);
    } else {
      this.#elMap.set(el, [data]);
    }
    this.#resizeObserver.observe(el);
  }
  /**
   * Clears and unobserves all currently tracked elements and managed targets.
   */
  clear() {
    for (const el of this.#elMap.keys()) {
      this.#resizeObserver.unobserve(el);
    }
    this.#elMap.clear();
  }
  /**
   * Removes all {@link ResizeObserverData.ResizeTarget} instances for the given element from monitoring when just an
   * element is provided otherwise removes a specific target from the monitoring map. If no more targets remain then
   * the element is removed from monitoring.
   *
   * @param {HTMLElement} el - Element to remove from monitoring.
   *
   * @param {import('./types').ResizeObserverData.ResizeTarget} [target] - A specific target to remove from monitoring.
   */
  remove(el, target = void 0) {
    const subscribers = this.#elMap.get(el);
    if (Array.isArray(subscribers)) {
      if (target !== void 0) {
        const index = subscribers.findIndex((entry) => entry.target === target);
        if (index >= 0) {
          subscribers.splice(index, 1);
        }
      } else {
        subscribers.length = 0;
      }
      if (subscribers.length === 0) {
        this.#elMap.delete(el);
        this.#resizeObserver.unobserve(el);
      }
    }
  }
  /**
   * Provides a function that when invoked with an element updates the cached styles for each subscriber of the
   * element.
   *
   * The style attributes cached to calculate offset height / width include border & padding dimensions. You only need
   * to update the cache if you change border or padding attributes of the element.
   *
   * @param {HTMLElement} el - A HTML element.
   */
  updateCache(el) {
    const subscribers = this.#elMap.get(el);
    if (Array.isArray(subscribers)) {
      const computed = globalThis.getComputedStyle(el);
      const borderBottom = StyleParse.pixels(el.style.borderBottom) ?? StyleParse.pixels(computed.borderBottom) ?? 0;
      const borderLeft = StyleParse.pixels(el.style.borderLeft) ?? StyleParse.pixels(computed.borderLeft) ?? 0;
      const borderRight = StyleParse.pixels(el.style.borderRight) ?? StyleParse.pixels(computed.borderRight) ?? 0;
      const borderTop = StyleParse.pixels(el.style.borderTop) ?? StyleParse.pixels(computed.borderTop) ?? 0;
      const paddingBottom = StyleParse.pixels(el.style.paddingBottom) ?? StyleParse.pixels(computed.paddingBottom) ?? 0;
      const paddingLeft = StyleParse.pixels(el.style.paddingLeft) ?? StyleParse.pixels(computed.paddingLeft) ?? 0;
      const paddingRight = StyleParse.pixels(el.style.paddingRight) ?? StyleParse.pixels(computed.paddingRight) ?? 0;
      const paddingTop = StyleParse.pixels(el.style.paddingTop) ?? StyleParse.pixels(computed.paddingTop) ?? 0;
      const additionalWidth = borderLeft + borderRight + paddingLeft + paddingRight;
      const additionalHeight = borderTop + borderBottom + paddingTop + paddingBottom;
      for (const subscriber of subscribers) {
        subscriber.styles.additionalWidth = additionalWidth;
        subscriber.styles.additionalHeight = additionalHeight;
        _ResizeObserverManager.#updateSubscriber(subscriber, subscriber.contentWidth, subscriber.contentHeight);
      }
    }
  }
  // Internal implementation ----------------------------------------------------------------------------------------
  /**
   * Determines the shape of the target instance regarding valid update mechanisms to set width & height changes.
   *
   * @param {import('./types').ResizeObserverData.ResizeTarget}  target - The target instance.
   *
   * @returns {number} Update type value.
   */
  static #getUpdateType(target) {
    if (typeof target?.resizeObserved === "function") {
      return this.#updateTypes.resizeObserved;
    }
    if (typeof target?.setDimension === "function") {
      return this.#updateTypes.setDimension;
    }
    if (typeof target?.setContentBounds === "function") {
      return this.#updateTypes.setContentBounds;
    }
    const targetType = typeof target;
    if (targetType !== null && (targetType === "object" || targetType === "function")) {
      if (isWritableStore(target.resizeObserved)) {
        return this.#updateTypes.storeObject;
      }
      const stores = target?.stores;
      if (isObject(stores) || typeof stores === "function") {
        if (isWritableStore(stores.resizeObserved)) {
          return this.#updateTypes.storesObject;
        }
      }
    }
    if (targetType !== null && targetType === "object") {
      return this.#updateTypes.attribute;
    }
    if (targetType === "function") {
      return this.#updateTypes.function;
    }
    return this.#updateTypes.none;
  }
  /**
   * Determines if a given element and target is already being observed.
   *
   * @param {HTMLElement} el - A HTMLElement.
   *
   * @param {import('./types').ResizeObserverData.ResizeTarget} [target] - A specific target to find.
   *
   * @returns {boolean} Whether the target is already being tracked for the given element.
   */
  #hasTarget(el, target) {
    if (target === void 0 || target === null) {
      return false;
    }
    const subscribers = this.#elMap.get(el);
    if (Array.isArray(subscribers)) {
      return subscribers.findIndex((entry) => entry.target === target) >= 0;
    }
    return false;
  }
  /**
   * Updates a subscriber target with given content width & height values. Offset width & height is calculated from
   * the content values + cached styles.
   *
   * @param {import('./types-local').ResizeObserverSubscriber} subscriber - Internal data about subscriber.
   *
   * @param {number|undefined}  contentWidth - ResizeObserver `contentRect.width` value or undefined.
   *
   * @param {number|undefined}  contentHeight - ResizeObserver `contentRect.height` value or undefined.
   */
  static #updateSubscriber(subscriber, contentWidth, contentHeight) {
    const styles = subscriber.styles;
    subscriber.contentWidth = contentWidth;
    subscriber.contentHeight = contentHeight;
    const offsetWidth = Number.isFinite(contentWidth) ? contentWidth + styles.additionalWidth : void 0;
    const offsetHeight = Number.isFinite(contentHeight) ? contentHeight + styles.additionalHeight : void 0;
    const target = subscriber.target;
    switch (subscriber.updateType) {
      case this.#updateTypes.attribute:
        target.contentWidth = contentWidth;
        target.contentHeight = contentHeight;
        target.offsetWidth = offsetWidth;
        target.offsetHeight = offsetHeight;
        break;
      case this.#updateTypes.function:
        target?.(offsetWidth, offsetHeight, contentWidth, contentHeight);
        break;
      case this.#updateTypes.resizeObserved:
        target.resizeObserved?.(offsetWidth, offsetHeight, contentWidth, contentHeight);
        break;
      case this.#updateTypes.setContentBounds:
        target.setContentBounds?.(contentWidth, contentHeight);
        break;
      case this.#updateTypes.setDimension:
        target.setDimension?.(offsetWidth, offsetHeight);
        break;
      case this.#updateTypes.storeObject:
        target.resizeObserved.update((object) => {
          object.contentHeight = contentHeight;
          object.contentWidth = contentWidth;
          object.offsetHeight = offsetHeight;
          object.offsetWidth = offsetWidth;
          return object;
        });
        break;
      case this.#updateTypes.storesObject:
        target.stores.resizeObserved.update((object) => {
          object.contentHeight = contentHeight;
          object.contentWidth = contentWidth;
          object.offsetHeight = offsetHeight;
          object.offsetWidth = offsetWidth;
          return object;
        });
        break;
    }
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/action/dom/observer/index.js
var resizeObserverActionManager = new ResizeObserverManager();
function resizeObserver(node, target) {
  resizeObserverActionManager.add(node, target);
  return {
    /**
     * @param {import('#runtime/util/dom/observer').ResizeObserverData.ResizeTarget} newTarget - A
     *        {@link ResizeObserverManager} target to update with observed width & height changes.
     */
    update: (newTarget) => {
      resizeObserverActionManager.remove(node, target);
      target = newTarget;
      resizeObserverActionManager.add(node, target);
    },
    destroy: () => {
      resizeObserverActionManager.remove(node, target);
    }
  };
}
resizeObserver.updateCache = function(el) {
  resizeObserverActionManager.updateCache(el);
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/action/util/index.js
function dynamicAction(node, { action, data } = {}) {
  let actionResult;
  if (typeof action === "function") {
    actionResult = action(node, data);
  }
  return {
    /**
     * @param {import('./types').DynamicActionOptions} newOptions - Defines the new action to dynamically mount.
     */
    update: (newOptions) => {
      if (!isObject(newOptions)) {
        actionResult?.destroy?.();
        action = void 0;
        data = void 0;
        return;
      }
      const { action: newAction, data: newData } = newOptions;
      if (typeof newAction !== "function") {
        console.warn(`dynamicAction.update warning: Aborting as 'action' is not a function.`);
        return;
      }
      const hasNewData = newData !== data;
      if (hasNewData) {
        data = newData;
      }
      if (newAction !== action) {
        actionResult?.destroy?.();
        action = newAction;
        actionResult = action(node, data);
      } else if (hasNewData) {
        actionResult?.update?.(data);
      }
    },
    destroy: () => {
      actionResult?.destroy?.();
      action = void 0;
      data = void 0;
      actionResult = void 0;
    }
  };
}

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/transition/index.js
var TJSDefaultTransition = class {
  static #options = {};
  static #default = () => void 0;
  /**
   * @returns {() => undefined} Default empty transition.
   */
  static get default() {
    return this.#default;
  }
  /**
   * @returns {{}} Default empty options.
   */
  static get options() {
    return this.#options;
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/AppShellContextInternal.js
var AppShellContextInternal = class {
  /** @type {import('./types').AppShell.Context.Internal.stores} */
  #stores;
  constructor() {
    this.#stores = {
      elementContent: writable(void 0),
      elementRoot: writable(void 0)
    };
    Object.freeze(this.#stores);
    Object.seal(this);
  }
  /**
   * @returns {import('./types').AppShell.Context.Internal.stores} The internal context stores for `elementContent` /
   *          `elementRoot`
   */
  get stores() {
    return this.#stores;
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/action/dom/inline-svg/index.js
function extractDimensionNumberAndUnit(dimension) {
  const regex = /(\d+)(\D*)/;
  const [, number = "0", unit = ""] = dimension.match(regex) || [];
  return { number: parseInt(number, 10), unit };
}
function calculateNewDimensions(base, constraint) {
  const { width, height } = base;
  if ("width" in constraint) {
    const { width: constraintWidth } = constraint;
    return {
      width: constraintWidth,
      height: constraintWidth / width * height
    };
  }
  const { height: constraintHeight } = constraint;
  return {
    width: constraintHeight / height * width,
    height: constraintHeight
  };
}
function calculateDimensions(local, remote) {
  const lWidthStr = local.getAttribute("width");
  const lHeightStr = local.getAttribute("height");
  if (lWidthStr && lHeightStr) {
    return { width: lWidthStr, height: lHeightStr };
  }
  const lDimension = { width: lWidthStr || "", height: lHeightStr || "" };
  const rWidthStr = remote.getAttribute("width");
  const rHeightStr = remote.getAttribute("height");
  const rViewBox = remote.getAttribute("viewBox");
  if (!(rWidthStr && rHeightStr || rViewBox)) {
    return lDimension;
  }
  let rWidth = 0;
  let rHeight = 0;
  let rWidthUnit = "";
  let rHeightUnit = "";
  if (rWidthStr && rHeightStr) {
    ({ number: rWidth, unit: rWidthUnit } = extractDimensionNumberAndUnit(rWidthStr));
    ({ number: rHeight, unit: rHeightUnit } = extractDimensionNumberAndUnit(rHeightStr));
  } else if (rViewBox) {
    [, , rWidth, rHeight] = rViewBox.split(" ").map((s) => parseInt(s, 10));
  }
  if (rWidthUnit !== rHeightUnit) {
    return {
      width: lWidthStr || rWidthStr || "",
      height: lHeightStr || rHeightStr || ""
    };
  }
  if (lWidthStr) {
    const { number, unit } = extractDimensionNumberAndUnit(lWidthStr);
    const cDimension = calculateNewDimensions(
      { width: rWidth, height: rHeight },
      { width: number }
    );
    const cUnit = unit || rWidthUnit;
    return {
      width: cDimension.width.toFixed(2) + cUnit,
      height: cDimension.height.toFixed(2) + cUnit
    };
  }
  if (lHeightStr) {
    const { number, unit } = extractDimensionNumberAndUnit(lHeightStr);
    const cDimension = calculateNewDimensions(
      { width: rWidth, height: rHeight },
      { height: number }
    );
    const cUnit = unit || rHeightUnit;
    return {
      width: cDimension.width.toFixed(2) + cUnit,
      height: cDimension.height.toFixed(2) + cUnit
    };
  }
  return {
    width: rWidth + rWidthUnit,
    height: rHeight + rHeightUnit
  };
}
function inlineSvg(node, param) {
  let config = resolveConfig(param);
  async function op() {
    if (config.src) {
      const response = await fetch(config.src, { cache: config.cache });
      const str = config.transform(await response.text());
      const svg = new DOMParser().parseFromString(str, "image/svg+xml").documentElement;
      for (let i = 0; i < svg.attributes.length; i++) {
        const attr = svg.attributes[i];
        if (!node.hasAttribute(attr.name) && !["width", "height"].includes(attr.name)) {
          node.setAttribute(attr.name, attr.value);
        }
      }
      if (config.autoDimensions) {
        const dimensions = calculateDimensions(node, svg);
        node.setAttribute("width", dimensions.width);
        node.setAttribute("height", dimensions.height);
      } else {
        node.setAttribute("width", node.getAttribute("width") || "");
        node.setAttribute("height", node.getAttribute("height") || "");
      }
      node.innerHTML = svg.innerHTML;
    }
  }
  op();
  return {
    update(update) {
      config = resolveConfig(update);
      op();
    }
  };
}
var DEFAULT_INLINE_SVG_ACTION_CONFIG = {
  src: "",
  cache: "no-cache",
  autoDimensions: true,
  transform: (svg) => svg
};
function resolveConfig(param = "") {
  if (typeof param === "string") {
    return {
      ...DEFAULT_INLINE_SVG_ACTION_CONFIG,
      src: param
    };
  }
  return {
    ...DEFAULT_INLINE_SVG_ACTION_CONFIG,
    ...param
  };
}

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSHeaderButton.svelte
var file2 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSHeaderButton.svelte";
function add_css2(target) {
  append_styles(target, "svelte-jlifdk", "button.svelte-jlifdk{color:var(--tjs-app-header-button-color);flex:0 0 var(--tjs-app-header-button-size);height:var(--tjs-app-header-button-size);min-height:var(--tjs-app-header-button-size)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVEpTSGVhZGVyQnV0dG9uLnN2ZWx0ZSIsIm1hcHBpbmdzIjoiQUFtSEcscUJBQ0csd0NBQXlDLENBQ3pDLDBDQUEyQyxDQUMzQyx3Q0FBeUMsQ0FDekMsNENBQ0giLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlRKU0hlYWRlckJ1dHRvbi5zdmVsdGUiXX0= */");
}
function create_fragment3(ctx) {
  let button_1;
  let button_1_class_value;
  let button_1_data_action_value;
  let button_1_data_tooltip_value;
  let applyStyles_action;
  let mounted;
  let dispose;
  const block = {
    c: function create() {
      button_1 = element("button");
      attr_dev(button_1, "type", "button");
      attr_dev(button_1, "class", button_1_class_value = "header-control icon " + /*icon*/
      ctx[5] + " " + /*button*/
      ctx[0].class + " svelte-jlifdk");
      attr_dev(button_1, "data-action", button_1_data_action_value = /*button*/
      ctx[0].class);
      attr_dev(button_1, "data-tooltip", button_1_data_tooltip_value = /*$storeHeaderButtonNoLabel*/
      ctx[6] ? null : (
        /*label*/
        ctx[4]
      ));
      attr_dev(
        button_1,
        "aria-label",
        /*label*/
        ctx[4]
      );
      toggle_class(
        button_1,
        "keep-minimized",
        /*keepMinimized*/
        ctx[3]
      );
      add_location(button_1, file2, 101, 0, 3633);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, button_1, anchor);
      if (!mounted) {
        dispose = [
          listen_dev(button_1, "click", stop_propagation(prevent_default(
            /*onClick*/
            ctx[7]
          )), false, true, true, false),
          listen_dev(button_1, "contextmenu", stop_propagation(prevent_default(
            /*onContextMenu*/
            ctx[8]
          )), false, true, true, false),
          listen_dev(
            button_1,
            "keydown",
            /*onKeydown*/
            ctx[9],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            button_1,
            "keyup",
            /*onKeyup*/
            ctx[10],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            button_1,
            /*styles*/
            ctx[2]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, [dirty]) {
      if (dirty & /*icon, button*/
      33 && button_1_class_value !== (button_1_class_value = "header-control icon " + /*icon*/
      ctx2[5] + " " + /*button*/
      ctx2[0].class + " svelte-jlifdk")) {
        attr_dev(button_1, "class", button_1_class_value);
      }
      if (dirty & /*button*/
      1 && button_1_data_action_value !== (button_1_data_action_value = /*button*/
      ctx2[0].class)) {
        attr_dev(button_1, "data-action", button_1_data_action_value);
      }
      if (dirty & /*$storeHeaderButtonNoLabel, label*/
      80 && button_1_data_tooltip_value !== (button_1_data_tooltip_value = /*$storeHeaderButtonNoLabel*/
      ctx2[6] ? null : (
        /*label*/
        ctx2[4]
      ))) {
        attr_dev(button_1, "data-tooltip", button_1_data_tooltip_value);
      }
      if (dirty & /*label*/
      16) {
        attr_dev(
          button_1,
          "aria-label",
          /*label*/
          ctx2[4]
        );
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/
      4) applyStyles_action.update.call(
        null,
        /*styles*/
        ctx2[2]
      );
      if (dirty & /*icon, button, keepMinimized*/
      41) {
        toggle_class(
          button_1,
          "keep-minimized",
          /*keepMinimized*/
          ctx2[3]
        );
      }
    },
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(button_1);
      }
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment3.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance3($$self, $$props, $$invalidate) {
  let icon;
  let label;
  let keepMinimized;
  let keyCode;
  let styles;
  let $storeHeaderButtonNoLabel, $$unsubscribe_storeHeaderButtonNoLabel = noop, $$subscribe_storeHeaderButtonNoLabel = () => ($$unsubscribe_storeHeaderButtonNoLabel(), $$unsubscribe_storeHeaderButtonNoLabel = subscribe(storeHeaderButtonNoLabel, ($$value) => $$invalidate(6, $storeHeaderButtonNoLabel = $$value)), storeHeaderButtonNoLabel);
  $$self.$$.on_destroy.push(() => $$unsubscribe_storeHeaderButtonNoLabel());
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("TJSHeaderButton", slots, []);
  let { button = void 0 } = $$props;
  let { storeHeaderButtonNoLabel = void 0 } = $$props;
  validate_store(storeHeaderButtonNoLabel, "storeHeaderButtonNoLabel");
  $$subscribe_storeHeaderButtonNoLabel();
  function onClick(event) {
    const invoke = button?.onPress ?? button?.onclick;
    if (typeof invoke === "function") {
      invoke({ button, event });
      $$invalidate(0, button);
    }
  }
  function onContextMenu(event) {
    if (button?.onContextMenu === "function") {
      button.onContextMenu({ button, event });
      $$invalidate(0, button);
    }
  }
  function onKeydown(event) {
    if (event.code === keyCode) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  function onKeyup(event) {
    if (event.code === keyCode) {
      const invoke = button.onPress ?? button.onclick;
      if (typeof invoke === "function") {
        invoke({ button, event });
        $$invalidate(0, button);
      }
      event.preventDefault();
      event.stopPropagation();
    }
  }
  const writable_props = ["button", "storeHeaderButtonNoLabel"];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<TJSHeaderButton> was created with unknown prop '${key}'`);
  });
  $$self.$$set = ($$props2) => {
    if ("button" in $$props2) $$invalidate(0, button = $$props2.button);
    if ("storeHeaderButtonNoLabel" in $$props2) $$subscribe_storeHeaderButtonNoLabel($$invalidate(1, storeHeaderButtonNoLabel = $$props2.storeHeaderButtonNoLabel));
  };
  $$self.$capture_state = () => ({
    applyStyles,
    localize,
    isObject,
    button,
    storeHeaderButtonNoLabel,
    onClick,
    onContextMenu,
    onKeydown,
    onKeyup,
    keyCode,
    styles,
    keepMinimized,
    label,
    icon,
    $storeHeaderButtonNoLabel
  });
  $$self.$inject_state = ($$props2) => {
    if ("button" in $$props2) $$invalidate(0, button = $$props2.button);
    if ("storeHeaderButtonNoLabel" in $$props2) $$subscribe_storeHeaderButtonNoLabel($$invalidate(1, storeHeaderButtonNoLabel = $$props2.storeHeaderButtonNoLabel));
    if ("keyCode" in $$props2) keyCode = $$props2.keyCode;
    if ("styles" in $$props2) $$invalidate(2, styles = $$props2.styles);
    if ("keepMinimized" in $$props2) $$invalidate(3, keepMinimized = $$props2.keepMinimized);
    if ("label" in $$props2) $$invalidate(4, label = $$props2.label);
    if ("icon" in $$props2) $$invalidate(5, icon = $$props2.icon);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*button*/
    1) {
      $: $$invalidate(5, icon = isObject(button) && typeof button.icon === "string" ? button.icon : void 0);
    }
    if ($$self.$$.dirty & /*button*/
    1) {
      $: $$invalidate(4, label = isObject(button) && typeof button.label === "string" ? localize(button.label) : void 0);
    }
    if ($$self.$$.dirty & /*button*/
    1) {
      $: $$invalidate(3, keepMinimized = isObject(button) && typeof button.keepMinimized === "boolean" ? button.keepMinimized : false);
    }
    if ($$self.$$.dirty & /*button*/
    1) {
      $: keyCode = isObject(button) && typeof button.keyCode === "string" ? button.keyCode : "Enter";
    }
    if ($$self.$$.dirty & /*button*/
    1) {
      $: $$invalidate(2, styles = isObject(button) && isObject(button.styles) ? button.styles : void 0);
    }
  };
  return [
    button,
    storeHeaderButtonNoLabel,
    styles,
    keepMinimized,
    label,
    icon,
    $storeHeaderButtonNoLabel,
    onClick,
    onContextMenu,
    onKeydown,
    onKeyup
  ];
}
var TJSHeaderButton = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance3, create_fragment3, safe_not_equal, { button: 0, storeHeaderButtonNoLabel: 1 }, add_css2);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "TJSHeaderButton",
      options,
      id: create_fragment3.name
    });
  }
  get button() {
    return this.$$.ctx[0];
  }
  set button(button) {
    this.$$set({ button });
    flush();
  }
  get storeHeaderButtonNoLabel() {
    return this.$$.ctx[1];
  }
  set storeHeaderButtonNoLabel(storeHeaderButtonNoLabel) {
    this.$$set({ storeHeaderButtonNoLabel });
    flush();
  }
};
var TJSHeaderButton_default = TJSHeaderButton;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSApplicationHeader.svelte
var { Object: Object_12 } = globals;
var file3 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSApplicationHeader.svelte";
function add_css3(target) {
  append_styles(target, "svelte-kjfwv7", ".not-draggable.svelte-kjfwv7.svelte-kjfwv7{--tjs-app-header-cursor:var(--tjs-app-header-cursor-not-draggable, var(--tjs-cursor-default, default))}.tjs-window-header-spacer.svelte-kjfwv7.svelte-kjfwv7{flex:0;margin-left:calc(-1 * var(--tjs-app-header-gap, 5px));margin-right:auto}svg.svelte-kjfwv7.svelte-kjfwv7{pointer-events:none}.window-header.svelte-kjfwv7.svelte-kjfwv7{display:flex;align-items:center;background:var(--tjs-app-header-background);cursor:var(--tjs-app-header-cursor, var(--tjs-cursor-grab, grab));flex:var(--tjs-app-header-flex, 0 0 var(--header-height));gap:var(--tjs-app-header-gap, 5px);padding:var(--tjs-app-header-padding, 0 0.5rem);font-family:var(--tjs-app-header-font-family, var(--tjs-app-font-family));font-size:var(--tjs-app-header-font-size, var(--tjs-app-font-size));font-weight:var(--tjs-app-header-font-weight, inherit);touch-action:none}.window-header.svelte-kjfwv7 .tjs-app-icon.svelte-kjfwv7{border-radius:var(--tjs-app-header-icon-border-radius, 4px);flex:0 0 var(--tjs-app-header-icon-width, 24px);height:var(--tjs-app-header-icon-height, 24px)}.window-title.svelte-kjfwv7.svelte-kjfwv7{font-family:inherit;font-size:inherit;font-weight:inherit;gap:var(--tjs-app-header-gap, 5px);max-width:fit-content;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVEpTQXBwbGljYXRpb25IZWFkZXIuc3ZlbHRlIiwibWFwcGluZ3MiOiJBQWlORywyQ0FDRyxzR0FDSCxDQU1BLHNEQUNHLE1BQU8sQ0FDUCxxREFBc0QsQ0FDdEQsaUJBQ0gsQ0FLQSxnQ0FDRyxtQkFDSCxDQUVBLDJDQUNHLFlBQWEsQ0FDYixrQkFBbUIsQ0FFbkIsMkNBQTRDLENBQzVDLGlFQUFrRSxDQUNsRSx5REFBMEQsQ0FDMUQsa0NBQW1DLENBQ25DLCtDQUFnRCxDQUVoRCx5RUFBMEUsQ0FDMUUsbUVBQW9FLENBQ3BFLHNEQUF1RCxDQUV2RCxpQkFDSCxDQUVBLHlEQUNHLDJEQUE0RCxDQUM1RCwrQ0FBZ0QsQ0FDaEQsOENBQ0gsQ0FFQSwwQ0FDRyxtQkFBb0IsQ0FDcEIsaUJBQWtCLENBQ2xCLG1CQUFvQixDQUVwQixrQ0FBbUMsQ0FDbkMscUJBQXNCLENBQ3RCLGVBQWdCLENBQ2hCLHNCQUF1QixDQUN2QixrQkFDSCIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiVEpTQXBwbGljYXRpb25IZWFkZXIuc3ZlbHRlIl19 */");
}
function get_each_context2(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[34] = list[i];
  return child_ctx;
}
function get_each_context_1(ctx, list, i) {
  const child_ctx = ctx.slice();
  child_ctx[34] = list[i];
  return child_ctx;
}
function create_if_block_22(ctx) {
  let svg;
  let inlineSvg_action;
  let mounted;
  let dispose;
  const block = {
    c: function create() {
      svg = svg_element("svg");
      attr_dev(svg, "class", "tjs-app-icon keep-minimized svelte-kjfwv7");
      add_location(svg, file3, 193, 9, 7558);
    },
    m: function mount(target, anchor) {
      insert_dev(target, svg, anchor);
      if (!mounted) {
        dispose = action_destroyer(inlineSvg_action = inlineSvg.call(null, svg, { src: (
          /*$storeHeaderIcon*/
          ctx[3]
        ) }));
        mounted = true;
      }
    },
    p: function update(ctx2, dirty) {
      if (inlineSvg_action && is_function(inlineSvg_action.update) && dirty[0] & /*$storeHeaderIcon*/
      8) inlineSvg_action.update.call(null, { src: (
        /*$storeHeaderIcon*/
        ctx2[3]
      ) });
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(svg);
      }
      mounted = false;
      dispose();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block_22.name,
    type: "if",
    source: "(193:36) ",
    ctx
  });
  return block;
}
function create_if_block_12(ctx) {
  let i;
  let i_class_value;
  const block = {
    c: function create() {
      i = element("i");
      attr_dev(i, "class", i_class_value = "window-icon keep-minimized " + /*$storeHeaderIcon*/
      ctx[3] + " svelte-kjfwv7");
      add_location(i, file3, 191, 9, 7448);
    },
    m: function mount(target, anchor) {
      insert_dev(target, i, anchor);
    },
    p: function update(ctx2, dirty) {
      if (dirty[0] & /*$storeHeaderIcon*/
      8 && i_class_value !== (i_class_value = "window-icon keep-minimized " + /*$storeHeaderIcon*/
      ctx2[3] + " svelte-kjfwv7")) {
        attr_dev(i, "class", i_class_value);
      }
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(i);
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block_12.name,
    type: "if",
    source: "(191:37) ",
    ctx
  });
  return block;
}
function create_if_block3(ctx) {
  let img;
  let img_src_value;
  const block = {
    c: function create() {
      img = element("img");
      attr_dev(img, "class", "tjs-app-icon keep-minimized svelte-kjfwv7");
      if (!src_url_equal(img.src, img_src_value = getRoutePrefix(
        /*$storeHeaderIcon*/
        ctx[3]
      ))) attr_dev(img, "src", img_src_value);
      attr_dev(img, "alt", "icon");
      add_location(img, file3, 189, 9, 7309);
    },
    m: function mount(target, anchor) {
      insert_dev(target, img, anchor);
    },
    p: function update(ctx2, dirty) {
      if (dirty[0] & /*$storeHeaderIcon*/
      8 && !src_url_equal(img.src, img_src_value = getRoutePrefix(
        /*$storeHeaderIcon*/
        ctx2[3]
      ))) {
        attr_dev(img, "src", img_src_value);
      }
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(img);
      }
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block3.name,
    type: "if",
    source: "(189:6) {#if mediaType === 'img'}",
    ctx
  });
  return block;
}
function create_each_block_1(ctx) {
  let switch_instance;
  let switch_instance_anchor;
  let current;
  const switch_instance_spread_levels = [
    /*button*/
    ctx[34].props
  ];
  var switch_value = (
    /*button*/
    ctx[34].class
  );
  function switch_props(ctx2, dirty) {
    let switch_instance_props = {};
    for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
      switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    }
    if (dirty !== void 0 && dirty[0] & /*buttonsLeft*/
    2) {
      switch_instance_props = assign(switch_instance_props, get_spread_update(switch_instance_spread_levels, [get_spread_object(
        /*button*/
        ctx2[34].props
      )]));
    }
    return {
      props: switch_instance_props,
      $$inline: true
    };
  }
  if (switch_value) {
    switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
  }
  const block = {
    c: function create() {
      if (switch_instance) create_component(switch_instance.$$.fragment);
      switch_instance_anchor = empty();
    },
    m: function mount(target, anchor) {
      if (switch_instance) mount_component(switch_instance, target, anchor);
      insert_dev(target, switch_instance_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      if (dirty[0] & /*buttonsLeft*/
      2 && switch_value !== (switch_value = /*button*/
      ctx2[34].class)) {
        if (switch_instance) {
          group_outros();
          const old_component = switch_instance;
          transition_out(old_component.$$.fragment, 1, 0, () => {
            destroy_component(old_component, 1);
          });
          check_outros();
        }
        if (switch_value) {
          switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx2, dirty));
          create_component(switch_instance.$$.fragment);
          transition_in(switch_instance.$$.fragment, 1);
          mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
        } else {
          switch_instance = null;
        }
      } else if (switch_value) {
        const switch_instance_changes = dirty[0] & /*buttonsLeft*/
        2 ? get_spread_update(switch_instance_spread_levels, [get_spread_object(
          /*button*/
          ctx2[34].props
        )]) : {};
        switch_instance.$set(switch_instance_changes);
      }
    },
    i: function intro(local) {
      if (current) return;
      if (switch_instance) transition_in(switch_instance.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      if (switch_instance) transition_out(switch_instance.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(switch_instance_anchor);
      }
      if (switch_instance) destroy_component(switch_instance, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_each_block_1.name,
    type: "each",
    source: "(199:6) {#each buttonsLeft as button}",
    ctx
  });
  return block;
}
function create_each_block2(ctx) {
  let switch_instance;
  let switch_instance_anchor;
  let current;
  const switch_instance_spread_levels = [
    /*button*/
    ctx[34].props
  ];
  var switch_value = (
    /*button*/
    ctx[34].class
  );
  function switch_props(ctx2, dirty) {
    let switch_instance_props = {};
    for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
      switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    }
    if (dirty !== void 0 && dirty[0] & /*buttonsRight*/
    4) {
      switch_instance_props = assign(switch_instance_props, get_spread_update(switch_instance_spread_levels, [get_spread_object(
        /*button*/
        ctx2[34].props
      )]));
    }
    return {
      props: switch_instance_props,
      $$inline: true
    };
  }
  if (switch_value) {
    switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx));
  }
  const block = {
    c: function create() {
      if (switch_instance) create_component(switch_instance.$$.fragment);
      switch_instance_anchor = empty();
    },
    m: function mount(target, anchor) {
      if (switch_instance) mount_component(switch_instance, target, anchor);
      insert_dev(target, switch_instance_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      if (dirty[0] & /*buttonsRight*/
      4 && switch_value !== (switch_value = /*button*/
      ctx2[34].class)) {
        if (switch_instance) {
          group_outros();
          const old_component = switch_instance;
          transition_out(old_component.$$.fragment, 1, 0, () => {
            destroy_component(old_component, 1);
          });
          check_outros();
        }
        if (switch_value) {
          switch_instance = construct_svelte_component_dev(switch_value, switch_props(ctx2, dirty));
          create_component(switch_instance.$$.fragment);
          transition_in(switch_instance.$$.fragment, 1);
          mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
        } else {
          switch_instance = null;
        }
      } else if (switch_value) {
        const switch_instance_changes = dirty[0] & /*buttonsRight*/
        4 ? get_spread_update(switch_instance_spread_levels, [get_spread_object(
          /*button*/
          ctx2[34].props
        )]) : {};
        switch_instance.$set(switch_instance_changes);
      }
    },
    i: function intro(local) {
      if (current) return;
      if (switch_instance) transition_in(switch_instance.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      if (switch_instance) transition_out(switch_instance.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(switch_instance_anchor);
      }
      if (switch_instance) destroy_component(switch_instance, detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_each_block2.name,
    type: "each",
    source: "(203:6) {#each buttonsRight as button}",
    ctx
  });
  return block;
}
function create_key_block(ctx) {
  let header;
  let t0;
  let h4;
  let t1_value = localize(
    /*$storeTitle*/
    ctx[9]
  ) + "";
  let t1;
  let t2;
  let t3;
  let span;
  let t4;
  let draggable_action;
  let minimizable_action;
  let current;
  let mounted;
  let dispose;
  function select_block_type(ctx2, dirty) {
    if (
      /*mediaType*/
      ctx2[7] === "img"
    ) return create_if_block3;
    if (
      /*mediaType*/
      ctx2[7] === "font"
    ) return create_if_block_12;
    if (
      /*mediaType*/
      ctx2[7] === "svg"
    ) return create_if_block_22;
  }
  let current_block_type = select_block_type(ctx, [-1, -1]);
  let if_block = current_block_type && current_block_type(ctx);
  let each_value_1 = ensure_array_like_dev(
    /*buttonsLeft*/
    ctx[1]
  );
  let each_blocks_1 = [];
  for (let i = 0; i < each_value_1.length; i += 1) {
    each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
  }
  const out = (i) => transition_out(each_blocks_1[i], 1, 1, () => {
    each_blocks_1[i] = null;
  });
  let each_value = ensure_array_like_dev(
    /*buttonsRight*/
    ctx[2]
  );
  let each_blocks = [];
  for (let i = 0; i < each_value.length; i += 1) {
    each_blocks[i] = create_each_block2(get_each_context2(ctx, each_value, i));
  }
  const out_1 = (i) => transition_out(each_blocks[i], 1, 1, () => {
    each_blocks[i] = null;
  });
  const block = {
    c: function create() {
      header = element("header");
      if (if_block) if_block.c();
      t0 = space();
      h4 = element("h4");
      t1 = text(t1_value);
      t2 = space();
      for (let i = 0; i < each_blocks_1.length; i += 1) {
        each_blocks_1[i].c();
      }
      t3 = space();
      span = element("span");
      t4 = space();
      for (let i = 0; i < each_blocks.length; i += 1) {
        each_blocks[i].c();
      }
      attr_dev(h4, "class", "window-title svelte-kjfwv7");
      set_style(
        h4,
        "display",
        /*displayHeaderTitle*/
        ctx[6]
      );
      add_location(h4, file3, 195, 6, 7668);
      attr_dev(span, "class", "tjs-window-header-spacer keep-minimized svelte-kjfwv7");
      add_location(span, file3, 201, 6, 7902);
      attr_dev(header, "class", "window-header svelte-kjfwv7");
      toggle_class(header, "not-draggable", !/*$storeDraggable*/
      ctx[4]);
      add_location(header, file3, 183, 3, 7053);
    },
    m: function mount(target, anchor) {
      insert_dev(target, header, anchor);
      if (if_block) if_block.m(header, null);
      append_dev(header, t0);
      append_dev(header, h4);
      append_dev(h4, t1);
      append_dev(header, t2);
      for (let i = 0; i < each_blocks_1.length; i += 1) {
        if (each_blocks_1[i]) {
          each_blocks_1[i].m(header, null);
        }
      }
      append_dev(header, t3);
      append_dev(header, span);
      append_dev(header, t4);
      for (let i = 0; i < each_blocks.length; i += 1) {
        if (each_blocks[i]) {
          each_blocks[i].m(header, null);
        }
      }
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(
            header,
            "pointerdown",
            /*onPointerdown*/
            ctx[21],
            false,
            false,
            false,
            false
          ),
          action_destroyer(draggable_action = /*draggable*/
          ctx[0].call(
            null,
            header,
            /*dragOptions*/
            ctx[5]
          )),
          action_destroyer(minimizable_action = /*minimizable*/
          ctx[20].call(
            null,
            header,
            /*$storeMinimizable*/
            ctx[8]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, dirty) {
      if (current_block_type === (current_block_type = select_block_type(ctx2, dirty)) && if_block) {
        if_block.p(ctx2, dirty);
      } else {
        if (if_block) if_block.d(1);
        if_block = current_block_type && current_block_type(ctx2);
        if (if_block) {
          if_block.c();
          if_block.m(header, t0);
        }
      }
      if ((!current || dirty[0] & /*$storeTitle*/
      512) && t1_value !== (t1_value = localize(
        /*$storeTitle*/
        ctx2[9]
      ) + "")) set_data_dev(t1, t1_value);
      if (dirty[0] & /*displayHeaderTitle*/
      64) {
        set_style(
          h4,
          "display",
          /*displayHeaderTitle*/
          ctx2[6]
        );
      }
      if (dirty[0] & /*buttonsLeft*/
      2) {
        each_value_1 = ensure_array_like_dev(
          /*buttonsLeft*/
          ctx2[1]
        );
        let i;
        for (i = 0; i < each_value_1.length; i += 1) {
          const child_ctx = get_each_context_1(ctx2, each_value_1, i);
          if (each_blocks_1[i]) {
            each_blocks_1[i].p(child_ctx, dirty);
            transition_in(each_blocks_1[i], 1);
          } else {
            each_blocks_1[i] = create_each_block_1(child_ctx);
            each_blocks_1[i].c();
            transition_in(each_blocks_1[i], 1);
            each_blocks_1[i].m(header, t3);
          }
        }
        group_outros();
        for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
          out(i);
        }
        check_outros();
      }
      if (dirty[0] & /*buttonsRight*/
      4) {
        each_value = ensure_array_like_dev(
          /*buttonsRight*/
          ctx2[2]
        );
        let i;
        for (i = 0; i < each_value.length; i += 1) {
          const child_ctx = get_each_context2(ctx2, each_value, i);
          if (each_blocks[i]) {
            each_blocks[i].p(child_ctx, dirty);
            transition_in(each_blocks[i], 1);
          } else {
            each_blocks[i] = create_each_block2(child_ctx);
            each_blocks[i].c();
            transition_in(each_blocks[i], 1);
            each_blocks[i].m(header, null);
          }
        }
        group_outros();
        for (i = each_value.length; i < each_blocks.length; i += 1) {
          out_1(i);
        }
        check_outros();
      }
      if (draggable_action && is_function(draggable_action.update) && dirty[0] & /*dragOptions*/
      32) draggable_action.update.call(
        null,
        /*dragOptions*/
        ctx2[5]
      );
      if (minimizable_action && is_function(minimizable_action.update) && dirty[0] & /*$storeMinimizable*/
      256) minimizable_action.update.call(
        null,
        /*$storeMinimizable*/
        ctx2[8]
      );
      if (!current || dirty[0] & /*$storeDraggable*/
      16) {
        toggle_class(header, "not-draggable", !/*$storeDraggable*/
        ctx2[4]);
      }
    },
    i: function intro(local) {
      if (current) return;
      for (let i = 0; i < each_value_1.length; i += 1) {
        transition_in(each_blocks_1[i]);
      }
      for (let i = 0; i < each_value.length; i += 1) {
        transition_in(each_blocks[i]);
      }
      current = true;
    },
    o: function outro(local) {
      each_blocks_1 = each_blocks_1.filter(Boolean);
      for (let i = 0; i < each_blocks_1.length; i += 1) {
        transition_out(each_blocks_1[i]);
      }
      each_blocks = each_blocks.filter(Boolean);
      for (let i = 0; i < each_blocks.length; i += 1) {
        transition_out(each_blocks[i]);
      }
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(header);
      }
      if (if_block) {
        if_block.d();
      }
      destroy_each(each_blocks_1, detaching);
      destroy_each(each_blocks, detaching);
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_key_block.name,
    type: "key",
    source: "(183:0) {#key draggable}",
    ctx
  });
  return block;
}
function create_fragment4(ctx) {
  let previous_key = (
    /*draggable*/
    ctx[0]
  );
  let key_block_anchor;
  let current;
  let key_block = create_key_block(ctx);
  const block = {
    c: function create() {
      key_block.c();
      key_block_anchor = empty();
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      key_block.m(target, anchor);
      insert_dev(target, key_block_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      if (dirty[0] & /*draggable*/
      1 && safe_not_equal(previous_key, previous_key = /*draggable*/
      ctx2[0])) {
        group_outros();
        transition_out(key_block, 1, 1, noop);
        check_outros();
        key_block = create_key_block(ctx2);
        key_block.c();
        transition_in(key_block, 1);
        key_block.m(key_block_anchor.parentNode, key_block_anchor);
      } else {
        key_block.p(ctx2, dirty);
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(key_block);
      current = true;
    },
    o: function outro(local) {
      transition_out(key_block);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(key_block_anchor);
      }
      key_block.d(detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment4.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance4($$self, $$props, $$invalidate) {
  let $focusKeep;
  let $focusAuto;
  let $elementRoot;
  let $storeHeaderIcon;
  let $storeHeaderButtons;
  let $storeMinimized;
  let $storeHeaderNoTitleMinimized;
  let $storeDraggable;
  let $storeMinimizable;
  let $storeTitle;
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("TJSApplicationHeader", slots, []);
  let { draggable: draggable2 = void 0 } = $$props;
  let { draggableOptions = void 0 } = $$props;
  const application = getContext("#external")?.application;
  const { focusAuto, focusKeep } = application.reactive.storeAppOptions;
  validate_store(focusAuto, "focusAuto");
  component_subscribe($$self, focusAuto, (value) => $$invalidate(27, $focusAuto = value));
  validate_store(focusKeep, "focusKeep");
  component_subscribe($$self, focusKeep, (value) => $$invalidate(26, $focusKeep = value));
  const { elementRoot } = getContext("#internal").stores;
  validate_store(elementRoot, "elementRoot");
  component_subscribe($$self, elementRoot, (value) => $$invalidate(28, $elementRoot = value));
  const storeTitle = application.reactive.storeAppOptions.title;
  validate_store(storeTitle, "storeTitle");
  component_subscribe($$self, storeTitle, (value) => $$invalidate(9, $storeTitle = value));
  const storeDraggable = application.reactive.storeAppOptions.draggable;
  validate_store(storeDraggable, "storeDraggable");
  component_subscribe($$self, storeDraggable, (value) => $$invalidate(4, $storeDraggable = value));
  const storeDragging = application.reactive.storeUIState.dragging;
  const storeHeaderButtons = application.reactive.storeUIState.headerButtons;
  validate_store(storeHeaderButtons, "storeHeaderButtons");
  component_subscribe($$self, storeHeaderButtons, (value) => $$invalidate(23, $storeHeaderButtons = value));
  const storeHeaderButtonNoLabel = application.reactive.storeAppOptions.headerButtonNoLabel;
  const storeHeaderIcon = application.reactive.storeAppOptions.headerIcon;
  validate_store(storeHeaderIcon, "storeHeaderIcon");
  component_subscribe($$self, storeHeaderIcon, (value) => $$invalidate(3, $storeHeaderIcon = value));
  const storeHeaderNoTitleMinimized = application.reactive.storeAppOptions.headerNoTitleMinimized;
  validate_store(storeHeaderNoTitleMinimized, "storeHeaderNoTitleMinimized");
  component_subscribe($$self, storeHeaderNoTitleMinimized, (value) => $$invalidate(25, $storeHeaderNoTitleMinimized = value));
  const storeMinimizable = application.reactive.storeAppOptions.minimizable;
  validate_store(storeMinimizable, "storeMinimizable");
  component_subscribe($$self, storeMinimizable, (value) => $$invalidate(8, $storeMinimizable = value));
  const storeMinimized = application.reactive.storeUIState.minimized;
  validate_store(storeMinimized, "storeMinimized");
  component_subscribe($$self, storeMinimized, (value) => $$invalidate(24, $storeMinimized = value));
  const s_DRAG_TARGET_CLASSLIST = Object.freeze(["tjs-app-icon", "tjs-window-header-spacer", "window-header", "window-title"]);
  let dragOptions;
  let displayHeaderTitle;
  let buttonsLeft;
  let buttonsRight;
  let mediaType = void 0;
  const mediaTypes = /* @__PURE__ */ new Set(["img", "svg"]);
  function minimizable(node, booleanStore) {
    const callback = (event) => {
      if (event.target.classList.contains("window-title") || event.target.classList.contains("window-header") || event.target.classList.contains("keep-minimized")) {
        application._onToggleMinimize(event);
      }
    };
    function activateListeners() {
      node.addEventListener("dblclick", callback);
    }
    function removeListeners() {
      node.removeEventListener("dblclick", callback);
    }
    if (booleanStore) {
      activateListeners();
    }
    return {
      update: (booleanStore2) => {
        if (booleanStore2) {
          activateListeners();
        } else {
          removeListeners();
        }
      },
      destroy: () => removeListeners()
    };
  }
  function onPointerdown(event) {
    const rootEl = $elementRoot;
    application.position.animate.cancel();
    if ($focusAuto && A11yHelper.isFocusTarget(rootEl) && rootEl?.isConnected) {
      if ($focusKeep) {
        const activeWindow = application.reactive.activeWindow;
        const focusOutside = A11yHelper.isFocusTarget(activeWindow.document.activeElement) && !rootEl.contains(activeWindow.document.activeElement);
        if (focusOutside) {
          rootEl.focus();
        } else {
          event.preventDefault();
        }
      } else {
        rootEl.focus();
      }
    }
  }
  const writable_props = ["draggable", "draggableOptions"];
  Object_12.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<TJSApplicationHeader> was created with unknown prop '${key}'`);
  });
  $$self.$$set = ($$props2) => {
    if ("draggable" in $$props2) $$invalidate(0, draggable2 = $$props2.draggable);
    if ("draggableOptions" in $$props2) $$invalidate(22, draggableOptions = $$props2.draggableOptions);
  };
  $$self.$capture_state = () => ({
    getContext,
    inlineSvg,
    TJSSvelte,
    A11yHelper,
    AssetValidator,
    localize,
    isObject,
    getRoutePrefix,
    dragDefault: draggable,
    TJSHeaderButton: TJSHeaderButton_default,
    draggable: draggable2,
    draggableOptions,
    application,
    focusAuto,
    focusKeep,
    elementRoot,
    storeTitle,
    storeDraggable,
    storeDragging,
    storeHeaderButtons,
    storeHeaderButtonNoLabel,
    storeHeaderIcon,
    storeHeaderNoTitleMinimized,
    storeMinimizable,
    storeMinimized,
    s_DRAG_TARGET_CLASSLIST,
    dragOptions,
    displayHeaderTitle,
    buttonsLeft,
    buttonsRight,
    mediaType,
    mediaTypes,
    minimizable,
    onPointerdown,
    $focusKeep,
    $focusAuto,
    $elementRoot,
    $storeHeaderIcon,
    $storeHeaderButtons,
    $storeMinimized,
    $storeHeaderNoTitleMinimized,
    $storeDraggable,
    $storeMinimizable,
    $storeTitle
  });
  $$self.$inject_state = ($$props2) => {
    if ("draggable" in $$props2) $$invalidate(0, draggable2 = $$props2.draggable);
    if ("draggableOptions" in $$props2) $$invalidate(22, draggableOptions = $$props2.draggableOptions);
    if ("dragOptions" in $$props2) $$invalidate(5, dragOptions = $$props2.dragOptions);
    if ("displayHeaderTitle" in $$props2) $$invalidate(6, displayHeaderTitle = $$props2.displayHeaderTitle);
    if ("buttonsLeft" in $$props2) $$invalidate(1, buttonsLeft = $$props2.buttonsLeft);
    if ("buttonsRight" in $$props2) $$invalidate(2, buttonsRight = $$props2.buttonsRight);
    if ("mediaType" in $$props2) $$invalidate(7, mediaType = $$props2.mediaType);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty[0] & /*draggable*/
    1) {
      $: $$invalidate(0, draggable2 = typeof draggable2 === "function" ? draggable2 : draggable);
    }
    if ($$self.$$.dirty[0] & /*draggableOptions, $storeDraggable*/
    4194320) {
      $: $$invalidate(5, dragOptions = Object.assign(
        {},
        {
          tween: true,
          tweenOptions: { duration: 0.06, ease: "cubicOut" }
        },
        isObject(draggableOptions) ? draggableOptions : {},
        {
          position: application.position,
          enabled: $storeDraggable,
          storeDragging,
          hasTargetClassList: s_DRAG_TARGET_CLASSLIST
        }
      ));
    }
    if ($$self.$$.dirty[0] & /*$storeHeaderNoTitleMinimized, $storeMinimized*/
    50331648) {
      $: $$invalidate(6, displayHeaderTitle = $storeHeaderNoTitleMinimized && $storeMinimized ? "none" : null);
    }
    if ($$self.$$.dirty[0] & /*$storeHeaderButtons, buttonsLeft, buttonsRight*/
    8388614) {
      $: {
        $$invalidate(1, buttonsLeft = []);
        $$invalidate(2, buttonsRight = []);
        for (const button of $storeHeaderButtons) {
          const buttonsList = typeof button?.alignLeft === "boolean" && button?.alignLeft ? buttonsLeft : buttonsRight;
          buttonsList.push(TJSSvelte.config.isConfigEmbed(button?.svelte) ? { ...button.svelte } : {
            class: TJSHeaderButton_default,
            props: { button, storeHeaderButtonNoLabel }
          });
        }
      }
    }
    if ($$self.$$.dirty[0] & /*$storeHeaderIcon*/
    8) {
      $: if (typeof $storeHeaderIcon === "string") {
        const result = AssetValidator.parseMedia({ url: $storeHeaderIcon, mediaTypes });
        $$invalidate(7, mediaType = result.valid ? result.elementType : "font");
      } else {
        $$invalidate(7, mediaType = void 0);
      }
    }
  };
  return [
    draggable2,
    buttonsLeft,
    buttonsRight,
    $storeHeaderIcon,
    $storeDraggable,
    dragOptions,
    displayHeaderTitle,
    mediaType,
    $storeMinimizable,
    $storeTitle,
    focusAuto,
    focusKeep,
    elementRoot,
    storeTitle,
    storeDraggable,
    storeHeaderButtons,
    storeHeaderIcon,
    storeHeaderNoTitleMinimized,
    storeMinimizable,
    storeMinimized,
    minimizable,
    onPointerdown,
    draggableOptions,
    $storeHeaderButtons,
    $storeMinimized,
    $storeHeaderNoTitleMinimized
  ];
}
var TJSApplicationHeader = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance4, create_fragment4, safe_not_equal, { draggable: 0, draggableOptions: 22 }, add_css3, [-1, -1]);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "TJSApplicationHeader",
      options,
      id: create_fragment4.name
    });
  }
  get draggable() {
    throw new Error("<TJSApplicationHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set draggable(value) {
    throw new Error("<TJSApplicationHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get draggableOptions() {
    throw new Error("<TJSApplicationHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set draggableOptions(value) {
    throw new Error("<TJSApplicationHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
};
var TJSApplicationHeader_default = TJSApplicationHeader;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/ResizeHandleTransform.js
var ResizeHandleTransform = class {
  /**
   * Stores inverted app transform matrix.
   */
  static #invMat = new Mat4();
  /**
   * Stores converted world delta width & height change.
   */
  static #pDeltaLocal = new Vec3();
  /**
   * Stores point down in local space.
   */
  static #pLocalDown = new Vec3();
  /**
   * Stores point drag in local space.
   */
  static #pLocalDrag = new Vec3();
  /**
   * Stores point down in world space.
   */
  static #pScreenDown = new Vec3();
  /**
   * Stores point drag in world space.
   */
  static #pScreenDrag = new Vec3();
  /**
   * Compute the delta width and height in local space given the app transform matrix and initial pointer down and
   * drag screen coordinates.
   *
   * @param {Mat4} transformMat - App transform matrix.
   *
   * @param {number} pScreenDownX - Pointer down X position in screen coords.
   *
   * @param {number} pScreenDownY - Pointer down Y position in screen coords.
   *
   * @param {number} pScreenDragX - Current pointer drag X position in screen coords.
   *
   * @param {number} pScreenDragY - Current pointer drag Y position in screen coords.
   *
   * @returns {Vec3} Output vector for width & height changes (x = deltaWidth, y = deltaHeight).
   */
  static computeDelta(transformMat, pScreenDownX, pScreenDownY, pScreenDragX, pScreenDragY) {
    Mat4.invert(this.#invMat, transformMat);
    this.#pScreenDown[0] = pScreenDownX;
    this.#pScreenDown[1] = pScreenDownY;
    this.#pScreenDrag[0] = pScreenDragX;
    this.#pScreenDrag[1] = pScreenDragY;
    Vec3.transformMat4(this.#pLocalDown, this.#pScreenDown, this.#invMat);
    Vec3.transformMat4(this.#pLocalDrag, this.#pScreenDrag, this.#invMat);
    this.#pDeltaLocal[0] = this.#pLocalDrag[0] - this.#pLocalDown[0];
    this.#pDeltaLocal[1] = this.#pLocalDrag[1] - this.#pLocalDown[1];
    return this.#pDeltaLocal;
  }
};

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/ResizableHandle.svelte
var file4 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/ResizableHandle.svelte";
function add_css4(target) {
  append_styles(target, "svelte-ovdb61", ".window-resize-handle.svelte-ovdb61{display:block;position:var(--tjs-app-resize-handle-position);width:var(--tjs-app-resize-handle-width);height:var(--tjs-app-resize-handle-height);background:var(--tjs-app-resize-handle-background);cursor:var(--tjs-app-resize-handle-cursor, var(--tjs-cursor-resize-nwse, nwse-resize));filter:var(--tjs-app-resize-handle-filter, none);inset:var(--tjs-app-resize-handle-inset);padding:var(--tjs-app-resize-handle-padding, 0);touch-action:none}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVzaXphYmxlSGFuZGxlLnN2ZWx0ZSIsIm1hcHBpbmdzIjoiQUEwTkcsb0NBQ0csYUFBYyxDQUNkLDhDQUErQyxDQUMvQyx3Q0FBeUMsQ0FDekMsMENBQTJDLENBRTNDLGtEQUFtRCxDQUNuRCxzRkFBdUYsQ0FDdkYsZ0RBQWlELENBQ2pELHdDQUF5QyxDQUN6QywrQ0FBZ0QsQ0FDaEQsaUJBQ0giLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlJlc2l6YWJsZUhhbmRsZS5zdmVsdGUiXX0= */");
}
function create_fragment5(ctx) {
  let div;
  let resizable_action;
  let mounted;
  let dispose;
  const block = {
    c: function create() {
      div = element("div");
      div.innerHTML = ``;
      attr_dev(div, "class", "window-resize-handle svelte-ovdb61");
      add_location(div, file4, 211, 0, 6364);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      ctx[11](div);
      if (!mounted) {
        dispose = [
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdown*/
            ctx[6],
            false,
            false,
            false,
            false
          ),
          action_destroyer(resizable_action = /*resizable*/
          ctx[7].call(null, div, {
            active: (
              /*$storeResizable*/
              ctx[1]
            ),
            storeResizing: (
              /*storeResizing*/
              ctx[5]
            )
          }))
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, [dirty]) {
      if (resizable_action && is_function(resizable_action.update) && dirty & /*$storeResizable*/
      2) resizable_action.update.call(null, {
        active: (
          /*$storeResizable*/
          ctx2[1]
        ),
        storeResizing: (
          /*storeResizing*/
          ctx2[5]
        )
      });
    },
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      ctx[11](null);
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment5.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance5($$self, $$props, $$invalidate) {
  let $storeElementRoot;
  let $storeMinimized;
  let $storeResizable;
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("ResizableHandle", slots, []);
  let { isResizable = false } = $$props;
  const application = getContext("#external")?.application;
  const storeElementRoot = getContext("#internal").stores.elementRoot;
  validate_store(storeElementRoot, "storeElementRoot");
  component_subscribe($$self, storeElementRoot, (value) => $$invalidate(9, $storeElementRoot = value));
  const storeResizable = application.reactive.storeAppOptions.resizable;
  validate_store(storeResizable, "storeResizable");
  component_subscribe($$self, storeResizable, (value) => $$invalidate(1, $storeResizable = value));
  const storeMinimized = application.reactive.storeUIState.minimized;
  validate_store(storeMinimized, "storeMinimized");
  component_subscribe($$self, storeMinimized, (value) => $$invalidate(10, $storeMinimized = value));
  const storeResizing = application.reactive.storeUIState.resizing;
  let elementResize;
  function onPointerdown() {
    application.position.animate.cancel();
  }
  function resizable(node, { active = true, storeResizing: storeResizing2 = void 0 } = {}) {
    let position = null;
    let resizing = false;
    let pScreenDownX = 0;
    let pScreenDownY = 0;
    const handlers = {
      resizeDown: ["pointerdown", (e) => onResizePointerDown(e), false],
      resizeMove: ["pointermove", (e) => onResizePointerMove(e), false],
      resizeUp: ["pointerup", (e) => onResizePointerUp(e), false]
    };
    function activateListeners() {
      node.addEventListener(...handlers.resizeDown);
      $$invalidate(8, isResizable = true);
      node.style.display = "block";
    }
    function removeListeners() {
      if (typeof storeResizing2?.set === "function") {
        storeResizing2.set(false);
      }
      node.removeEventListener(...handlers.resizeDown);
      node.removeEventListener(...handlers.resizeMove);
      node.removeEventListener(...handlers.resizeUp);
      node.style.display = "none";
      $$invalidate(8, isResizable = false);
    }
    if (active) {
      activateListeners();
    } else {
      node.style.display = "none";
    }
    function onResizePointerDown(event) {
      event.preventDefault();
      resizing = false;
      position = application.position.get();
      if (position.height === "auto") {
        position.height = $storeElementRoot.clientHeight;
      }
      if (position.width === "auto") {
        position.width = $storeElementRoot.clientWidth;
      }
      pScreenDownX = event.clientX;
      pScreenDownY = event.clientY;
      node.addEventListener(...handlers.resizeMove);
      node.addEventListener(...handlers.resizeUp);
      node.setPointerCapture(event.pointerId);
    }
    function onResizePointerMove(event) {
      event.preventDefault();
      if (!resizing && typeof storeResizing2?.set === "function") {
        resizing = true;
        storeResizing2.set(true);
      }
      const pDeltaLocal = ResizeHandleTransform.computeDelta(application.position.transform.mat4, pScreenDownX, pScreenDownY, event.clientX, event.clientY);
      application.position.set({
        width: position.width + pDeltaLocal[0],
        height: position.height + pDeltaLocal[1]
      });
    }
    function onResizePointerUp(event) {
      resizing = false;
      if (typeof storeResizing2?.set === "function") {
        storeResizing2.set(false);
      }
      event.preventDefault();
      node.removeEventListener(...handlers.resizeMove);
      node.removeEventListener(...handlers.resizeUp);
      application?._onResize?.(event);
    }
    return {
      update: ({ active: active2 }) => {
        if (active2) {
          activateListeners();
        } else {
          removeListeners();
        }
      },
      destroy: () => removeListeners()
    };
  }
  const writable_props = ["isResizable"];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<ResizableHandle> was created with unknown prop '${key}'`);
  });
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementResize = $$value;
      $$invalidate(0, elementResize), $$invalidate(8, isResizable), $$invalidate(10, $storeMinimized), $$invalidate(9, $storeElementRoot);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("isResizable" in $$props2) $$invalidate(8, isResizable = $$props2.isResizable);
  };
  $$self.$capture_state = () => ({
    getContext,
    ResizeHandleTransform,
    isResizable,
    application,
    storeElementRoot,
    storeResizable,
    storeMinimized,
    storeResizing,
    elementResize,
    onPointerdown,
    resizable,
    $storeElementRoot,
    $storeMinimized,
    $storeResizable
  });
  $$self.$inject_state = ($$props2) => {
    if ("isResizable" in $$props2) $$invalidate(8, isResizable = $$props2.isResizable);
    if ("elementResize" in $$props2) $$invalidate(0, elementResize = $$props2.elementResize);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*elementResize, isResizable, $storeMinimized, $storeElementRoot*/
    1793) {
      $: if (elementResize) {
        $$invalidate(0, elementResize.style.display = isResizable && !$storeMinimized ? "block" : "none", elementResize);
        const elementRoot = $storeElementRoot;
        if (elementRoot) {
          elementRoot.classList[isResizable ? "add" : "remove"]("resizable");
        }
      }
    }
  };
  return [
    elementResize,
    $storeResizable,
    storeElementRoot,
    storeResizable,
    storeMinimized,
    storeResizing,
    onPointerdown,
    resizable,
    isResizable,
    $storeElementRoot,
    $storeMinimized,
    div_binding
  ];
}
var ResizableHandle = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance5, create_fragment5, safe_not_equal, { isResizable: 8 }, add_css4);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "ResizableHandle",
      options,
      id: create_fragment5.name
    });
  }
  get isResizable() {
    throw new Error("<ResizableHandle>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set isResizable(value) {
    throw new Error("<ResizableHandle>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
};
var ResizableHandle_default = ResizableHandle;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/internal/dom/TJSFocusWrap.svelte
var file5 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/internal/dom/TJSFocusWrap.svelte";
function add_css5(target) {
  append_styles(target, "svelte-udwy0t", "div.svelte-udwy0t{width:0;height:0;flex:0}div.svelte-udwy0t:focus{outline:none}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVEpTRm9jdXNXcmFwLnN2ZWx0ZSIsIm1hcHBpbmdzIjoiQUE2Q0ksa0JBQ0ksT0FBUSxDQUNSLFFBQVMsQ0FDVCxNQUNKLENBRUEsd0JBQ0ksWUFDSiIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiVEpTRm9jdXNXcmFwLnN2ZWx0ZSJdfQ== */");
}
function create_fragment6(ctx) {
  let div;
  let mounted;
  let dispose;
  const block = {
    c: function create() {
      div = element("div");
      attr_dev(div, "class", "tjs-focus-wrap svelte-udwy0t");
      attr_dev(div, "tabindex", "0");
      add_location(div, file5, 42, 0, 1105);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      ctx[4](div);
      if (!mounted) {
        dispose = listen_dev(
          div,
          "focus",
          /*onFocus*/
          ctx[1],
          false,
          false,
          false,
          false
        );
        mounted = true;
      }
    },
    p: noop,
    i: noop,
    o: noop,
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      ctx[4](null);
      mounted = false;
      dispose();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment6.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance6($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("TJSFocusWrap", slots, []);
  let { elementRoot = void 0 } = $$props;
  let { enabled = true } = $$props;
  let ignoreElements, wrapEl;
  function onFocus() {
    if (!enabled) {
      return;
    }
    if (A11yHelper.isFocusTarget(elementRoot)) {
      const firstFocusEl = A11yHelper.getFirstFocusableElement(elementRoot, ignoreElements);
      if (A11yHelper.isFocusTarget(firstFocusEl) && firstFocusEl !== wrapEl) {
        firstFocusEl.focus();
      } else {
        elementRoot.focus();
      }
    }
  }
  const writable_props = ["elementRoot", "enabled"];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<TJSFocusWrap> was created with unknown prop '${key}'`);
  });
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      wrapEl = $$value;
      $$invalidate(0, wrapEl);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("elementRoot" in $$props2) $$invalidate(2, elementRoot = $$props2.elementRoot);
    if ("enabled" in $$props2) $$invalidate(3, enabled = $$props2.enabled);
  };
  $$self.$capture_state = () => ({
    A11yHelper,
    elementRoot,
    enabled,
    ignoreElements,
    wrapEl,
    onFocus
  });
  $$self.$inject_state = ($$props2) => {
    if ("elementRoot" in $$props2) $$invalidate(2, elementRoot = $$props2.elementRoot);
    if ("enabled" in $$props2) $$invalidate(3, enabled = $$props2.enabled);
    if ("ignoreElements" in $$props2) ignoreElements = $$props2.ignoreElements;
    if ("wrapEl" in $$props2) $$invalidate(0, wrapEl = $$props2.wrapEl);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*wrapEl*/
    1) {
      $: if (wrapEl) {
        ignoreElements = /* @__PURE__ */ new Set([wrapEl]);
      }
    }
  };
  return [wrapEl, onFocus, elementRoot, enabled, div_binding];
}
var TJSFocusWrap = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(this, options, instance6, create_fragment6, safe_not_equal, { elementRoot: 2, enabled: 3 }, add_css5);
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "TJSFocusWrap",
      options,
      id: create_fragment6.name
    });
  }
  get elementRoot() {
    throw new Error("<TJSFocusWrap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set elementRoot(value) {
    throw new Error("<TJSFocusWrap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get enabled() {
    throw new Error("<TJSFocusWrap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set enabled(value) {
    throw new Error("<TJSFocusWrap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
};
var TJSFocusWrap_default = TJSFocusWrap;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/ApplicationShell.svelte
var file6 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/ApplicationShell.svelte";
function add_css6(target) {
  append_styles(target, "svelte-ffhbpt", ".application.svelte-ffhbpt.svelte-ffhbpt{contain:layout style paint;max-width:var(--tjs-app-max-width, unset);max-height:var(--tjs-app-max-height, unset);min-width:var(--tjs-app-min-width, unset);min-height:var(--tjs-app-min-height, unset);overflow:var(--tjs-app-overflow, hidden);scrollbar-width:var(--tjs-app-scrollbar-width, inherit);scrollbar-color:var(--tjs-app-scrollbar-color, inherit)}.application.mounted.svelte-ffhbpt.svelte-ffhbpt{container:tjs-app-window / inline-size}.application.svelte-ffhbpt.svelte-ffhbpt:focus-visible{outline:var(--tjs-app-content-outline-focus-visible, var(--tjs-default-a11y-outline-focus-visible, 2px solid transparent))}.application.mounted.svelte-ffhbpt .window-content.svelte-ffhbpt{container:tjs-app-window-content / inline-size}.window-content.svelte-ffhbpt.svelte-ffhbpt:focus-visible{outline:var(--tjs-app-content-outline-focus-visible, var(--tjs-default-a11y-outline-focus-visible, 2px solid transparent))}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwbGljYXRpb25TaGVsbC5zdmVsdGUiLCJtYXBwaW5ncyI6IkFBMmRHLHlDQUNHLDBCQUEyQixDQUUzQix5Q0FBMEMsQ0FDMUMsMkNBQTRDLENBRTVDLHlDQUEwQyxDQUMxQywyQ0FBNEMsQ0FFNUMsd0NBQXlDLENBRXpDLHVEQUF3RCxDQUN4RCx1REFDSCxDQUdBLGlEQUNHLHNDQUNILENBRUEsdURBQ0csMEhBQ0gsQ0FHQSxpRUFDRyw4Q0FDSCxDQUVBLDBEQUNHLDBIQUNIIiwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBcHBsaWNhdGlvblNoZWxsLnN2ZWx0ZSJdfQ== */");
}
function create_else_block2(ctx) {
  let div;
  let tjsapplicationheader;
  let t0;
  let section;
  let applyStyles_action;
  let contentResizeObserver_action;
  let t1;
  let resizablehandle;
  let t2;
  let tjsfocuswrap;
  let div_id_value;
  let div_class_value;
  let div_data_appid_value;
  let applyStyles_action_1;
  let dynamicAction_action;
  let current;
  let mounted;
  let dispose;
  tjsapplicationheader = new TJSApplicationHeader_default({
    props: {
      draggable: (
        /*draggable*/
        ctx[6]
      ),
      draggableOptions: (
        /*draggableOptions*/
        ctx[7]
      )
    },
    $$inline: true
  });
  const default_slot_template = (
    /*#slots*/
    ctx[41].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[40],
    null
  );
  resizablehandle = new ResizableHandle_default({ $$inline: true });
  tjsfocuswrap = new TJSFocusWrap_default({
    props: {
      elementRoot: (
        /*elementRoot*/
        ctx[1]
      ),
      enabled: (
        /*focusWrapEnabled*/
        ctx[11]
      )
    },
    $$inline: true
  });
  const block = {
    c: function create() {
      div = element("div");
      create_component(tjsapplicationheader.$$.fragment);
      t0 = space();
      section = element("section");
      if (default_slot) default_slot.c();
      t1 = space();
      create_component(resizablehandle.$$.fragment);
      t2 = space();
      create_component(tjsfocuswrap.$$.fragment);
      attr_dev(section, "class", "window-content svelte-ffhbpt");
      attr_dev(section, "tabindex", "-1");
      add_location(section, file6, 460, 6, 19670);
      attr_dev(div, "id", div_id_value = /*application*/
      ctx[10].id);
      attr_dev(div, "class", div_class_value = "application " + /*appClasses*/
      ctx[12] + " svelte-ffhbpt");
      attr_dev(div, "data-appid", div_data_appid_value = /*application*/
      ctx[10].appId);
      attr_dev(div, "role", "application");
      attr_dev(div, "tabindex", "-1");
      toggle_class(
        div,
        "mounted",
        /*mounted*/
        ctx[13]
      );
      add_location(div, file6, 447, 3, 19142);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      mount_component(tjsapplicationheader, div, null);
      append_dev(div, t0);
      append_dev(div, section);
      if (default_slot) {
        default_slot.m(section, null);
      }
      ctx[44](section);
      append_dev(div, t1);
      mount_component(resizablehandle, div, null);
      append_dev(div, t2);
      mount_component(tjsfocuswrap, div, null);
      ctx[45](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(
            section,
            "pointerdown",
            /*onPointerdownContent*/
            ctx[25],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            section,
            /*stylesContent*/
            ctx[9]
          )),
          action_destroyer(contentResizeObserver_action = /*contentResizeObserver*/
          ctx[20].call(
            null,
            section,
            /*resizeObservedContent*/
            ctx[26]
          )),
          listen_dev(div, "close:popup", stop_propagation(prevent_default(
            /*onClosePopup*/
            ctx[22]
          )), false, true, true, false),
          listen_dev(
            div,
            "keydown",
            /*onKeydown*/
            ctx[23],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownApp*/
            ctx[24],
            true,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action_1 = applyStyles.call(
            null,
            div,
            /*stylesApp*/
            ctx[8]
          )),
          action_destroyer(dynamicAction_action = dynamicAction.call(
            null,
            div,
            /*appResizeObserver*/
            ctx[14]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, dirty) {
      const tjsapplicationheader_changes = {};
      if (dirty[0] & /*draggable*/
      64) tjsapplicationheader_changes.draggable = /*draggable*/
      ctx2[6];
      if (dirty[0] & /*draggableOptions*/
      128) tjsapplicationheader_changes.draggableOptions = /*draggableOptions*/
      ctx2[7];
      tjsapplicationheader.$set(tjsapplicationheader_changes);
      if (default_slot) {
        if (default_slot.p && (!current || dirty[1] & /*$$scope*/
        512)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[40],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[40]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[40],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*stylesContent*/
      512) applyStyles_action.update.call(
        null,
        /*stylesContent*/
        ctx2[9]
      );
      const tjsfocuswrap_changes = {};
      if (dirty[0] & /*elementRoot*/
      2) tjsfocuswrap_changes.elementRoot = /*elementRoot*/
      ctx2[1];
      if (dirty[0] & /*focusWrapEnabled*/
      2048) tjsfocuswrap_changes.enabled = /*focusWrapEnabled*/
      ctx2[11];
      tjsfocuswrap.$set(tjsfocuswrap_changes);
      if (!current || dirty[0] & /*application*/
      1024 && div_id_value !== (div_id_value = /*application*/
      ctx2[10].id)) {
        attr_dev(div, "id", div_id_value);
      }
      if (!current || dirty[0] & /*appClasses*/
      4096 && div_class_value !== (div_class_value = "application " + /*appClasses*/
      ctx2[12] + " svelte-ffhbpt")) {
        attr_dev(div, "class", div_class_value);
      }
      if (!current || dirty[0] & /*application*/
      1024 && div_data_appid_value !== (div_data_appid_value = /*application*/
      ctx2[10].appId)) {
        attr_dev(div, "data-appid", div_data_appid_value);
      }
      if (applyStyles_action_1 && is_function(applyStyles_action_1.update) && dirty[0] & /*stylesApp*/
      256) applyStyles_action_1.update.call(
        null,
        /*stylesApp*/
        ctx2[8]
      );
      if (dynamicAction_action && is_function(dynamicAction_action.update) && dirty[0] & /*appResizeObserver*/
      16384) dynamicAction_action.update.call(
        null,
        /*appResizeObserver*/
        ctx2[14]
      );
      if (!current || dirty[0] & /*appClasses, mounted*/
      12288) {
        toggle_class(
          div,
          "mounted",
          /*mounted*/
          ctx2[13]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(tjsapplicationheader.$$.fragment, local);
      transition_in(default_slot, local);
      transition_in(resizablehandle.$$.fragment, local);
      transition_in(tjsfocuswrap.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(tjsapplicationheader.$$.fragment, local);
      transition_out(default_slot, local);
      transition_out(resizablehandle.$$.fragment, local);
      transition_out(tjsfocuswrap.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      destroy_component(tjsapplicationheader);
      if (default_slot) default_slot.d(detaching);
      ctx[44](null);
      destroy_component(resizablehandle);
      destroy_component(tjsfocuswrap);
      ctx[45](null);
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_else_block2.name,
    type: "else",
    source: "(446:0) {:else}",
    ctx
  });
  return block;
}
function create_if_block4(ctx) {
  let div;
  let tjsapplicationheader;
  let t0;
  let section;
  let applyStyles_action;
  let contentResizeObserver_action;
  let t1;
  let resizablehandle;
  let t2;
  let tjsfocuswrap;
  let div_id_value;
  let div_class_value;
  let div_data_appid_value;
  let applyStyles_action_1;
  let dynamicAction_action;
  let div_intro;
  let div_outro;
  let current;
  let mounted;
  let dispose;
  tjsapplicationheader = new TJSApplicationHeader_default({
    props: {
      draggable: (
        /*draggable*/
        ctx[6]
      ),
      draggableOptions: (
        /*draggableOptions*/
        ctx[7]
      )
    },
    $$inline: true
  });
  const default_slot_template = (
    /*#slots*/
    ctx[41].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[40],
    null
  );
  resizablehandle = new ResizableHandle_default({ $$inline: true });
  tjsfocuswrap = new TJSFocusWrap_default({
    props: { elementRoot: (
      /*elementRoot*/
      ctx[1]
    ) },
    $$inline: true
  });
  const block = {
    c: function create() {
      div = element("div");
      create_component(tjsapplicationheader.$$.fragment);
      t0 = space();
      section = element("section");
      if (default_slot) default_slot.c();
      t1 = space();
      create_component(resizablehandle.$$.fragment);
      t2 = space();
      create_component(tjsfocuswrap.$$.fragment);
      attr_dev(section, "class", "window-content svelte-ffhbpt");
      attr_dev(section, "tabindex", "-1");
      add_location(section, file6, 434, 6, 18675);
      attr_dev(div, "id", div_id_value = /*application*/
      ctx[10].id);
      attr_dev(div, "class", div_class_value = "application " + /*appClasses*/
      ctx[12] + " svelte-ffhbpt");
      attr_dev(div, "data-appid", div_data_appid_value = /*application*/
      ctx[10].appId);
      attr_dev(div, "role", "application");
      attr_dev(div, "tabindex", "-1");
      toggle_class(
        div,
        "mounted",
        /*mounted*/
        ctx[13]
      );
      add_location(div, file6, 419, 3, 18036);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      mount_component(tjsapplicationheader, div, null);
      append_dev(div, t0);
      append_dev(div, section);
      if (default_slot) {
        default_slot.m(section, null);
      }
      ctx[42](section);
      append_dev(div, t1);
      mount_component(resizablehandle, div, null);
      append_dev(div, t2);
      mount_component(tjsfocuswrap, div, null);
      ctx[43](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(
            section,
            "pointerdown",
            /*onPointerdownContent*/
            ctx[25],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            section,
            /*stylesContent*/
            ctx[9]
          )),
          action_destroyer(contentResizeObserver_action = /*contentResizeObserver*/
          ctx[20].call(
            null,
            section,
            /*resizeObservedContent*/
            ctx[26]
          )),
          listen_dev(div, "close:popup", stop_propagation(prevent_default(
            /*onClosePopup*/
            ctx[22]
          )), false, true, true, false),
          listen_dev(
            div,
            "keydown",
            /*onKeydown*/
            ctx[23],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownApp*/
            ctx[24],
            true,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action_1 = applyStyles.call(
            null,
            div,
            /*stylesApp*/
            ctx[8]
          )),
          action_destroyer(dynamicAction_action = dynamicAction.call(
            null,
            div,
            /*appResizeObserver*/
            ctx[14]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(new_ctx, dirty) {
      ctx = new_ctx;
      const tjsapplicationheader_changes = {};
      if (dirty[0] & /*draggable*/
      64) tjsapplicationheader_changes.draggable = /*draggable*/
      ctx[6];
      if (dirty[0] & /*draggableOptions*/
      128) tjsapplicationheader_changes.draggableOptions = /*draggableOptions*/
      ctx[7];
      tjsapplicationheader.$set(tjsapplicationheader_changes);
      if (default_slot) {
        if (default_slot.p && (!current || dirty[1] & /*$$scope*/
        512)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx,
            /*$$scope*/
            ctx[40],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx[40]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx[40],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*stylesContent*/
      512) applyStyles_action.update.call(
        null,
        /*stylesContent*/
        ctx[9]
      );
      const tjsfocuswrap_changes = {};
      if (dirty[0] & /*elementRoot*/
      2) tjsfocuswrap_changes.elementRoot = /*elementRoot*/
      ctx[1];
      tjsfocuswrap.$set(tjsfocuswrap_changes);
      if (!current || dirty[0] & /*application*/
      1024 && div_id_value !== (div_id_value = /*application*/
      ctx[10].id)) {
        attr_dev(div, "id", div_id_value);
      }
      if (!current || dirty[0] & /*appClasses*/
      4096 && div_class_value !== (div_class_value = "application " + /*appClasses*/
      ctx[12] + " svelte-ffhbpt")) {
        attr_dev(div, "class", div_class_value);
      }
      if (!current || dirty[0] & /*application*/
      1024 && div_data_appid_value !== (div_data_appid_value = /*application*/
      ctx[10].appId)) {
        attr_dev(div, "data-appid", div_data_appid_value);
      }
      if (applyStyles_action_1 && is_function(applyStyles_action_1.update) && dirty[0] & /*stylesApp*/
      256) applyStyles_action_1.update.call(
        null,
        /*stylesApp*/
        ctx[8]
      );
      if (dynamicAction_action && is_function(dynamicAction_action.update) && dirty[0] & /*appResizeObserver*/
      16384) dynamicAction_action.update.call(
        null,
        /*appResizeObserver*/
        ctx[14]
      );
      if (!current || dirty[0] & /*appClasses, mounted*/
      12288) {
        toggle_class(
          div,
          "mounted",
          /*mounted*/
          ctx[13]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(tjsapplicationheader.$$.fragment, local);
      transition_in(default_slot, local);
      transition_in(resizablehandle.$$.fragment, local);
      transition_in(tjsfocuswrap.$$.fragment, local);
      add_render_callback(() => {
        if (!current) return;
        if (div_outro) div_outro.end(1);
        div_intro = create_in_transition(
          div,
          /*inTransition*/
          ctx[2],
          /*inTransitionOptions*/
          ctx[4]
        );
        div_intro.start();
      });
      current = true;
    },
    o: function outro(local) {
      transition_out(tjsapplicationheader.$$.fragment, local);
      transition_out(default_slot, local);
      transition_out(resizablehandle.$$.fragment, local);
      transition_out(tjsfocuswrap.$$.fragment, local);
      if (div_intro) div_intro.invalidate();
      div_outro = create_out_transition(
        div,
        /*outTransition*/
        ctx[3],
        /*outTransitionOptions*/
        ctx[5]
      );
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      destroy_component(tjsapplicationheader);
      if (default_slot) default_slot.d(detaching);
      ctx[42](null);
      destroy_component(resizablehandle);
      destroy_component(tjsfocuswrap);
      ctx[43](null);
      if (detaching && div_outro) div_outro.end();
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block4.name,
    type: "if",
    source: "(418:0) {#if inTransition !== TJSDefaultTransition.default || outTransition !== TJSDefaultTransition.default}",
    ctx
  });
  return block;
}
function create_fragment7(ctx) {
  let current_block_type_index;
  let if_block;
  let if_block_anchor;
  let current;
  const if_block_creators = [create_if_block4, create_else_block2];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*inTransition*/
      ctx2[2] !== TJSDefaultTransition.default || /*outTransition*/
      ctx2[3] !== TJSDefaultTransition.default
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx, [-1, -1]);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  const block = {
    c: function create() {
      if_block.c();
      if_block_anchor = empty();
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      if_blocks[current_block_type_index].m(target, anchor);
      insert_dev(target, if_block_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2, dirty);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(if_block_anchor.parentNode, if_block_anchor);
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o: function outro(local) {
      transition_out(if_block);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(if_block_anchor);
      }
      if_blocks[current_block_type_index].d(detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment7.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance7($$self, $$props, $$invalidate) {
  let appResizeObserver;
  let $focusKeep;
  let $focusAuto;
  let $themeStore;
  let $minimized;
  let $focusTrap;
  let $resizeObservable;
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("ApplicationShell", slots, ["default"]);
  let { elementContent = void 0 } = $$props;
  let { elementRoot = void 0 } = $$props;
  let { draggable: draggable2 = void 0 } = $$props;
  let { draggableOptions = void 0 } = $$props;
  let { stylesApp = void 0 } = $$props;
  let { stylesContent = void 0 } = $$props;
  const application = getContext("#external")?.application;
  const { focusAuto, focusKeep, focusTrap } = application.reactive.storeAppOptions;
  validate_store(focusAuto, "focusAuto");
  component_subscribe($$self, focusAuto, (value) => $$invalidate(35, $focusAuto = value));
  validate_store(focusKeep, "focusKeep");
  component_subscribe($$self, focusKeep, (value) => $$invalidate(46, $focusKeep = value));
  validate_store(focusTrap, "focusTrap");
  component_subscribe($$self, focusTrap, (value) => $$invalidate(38, $focusTrap = value));
  const { minimized } = application.reactive.storeUIState;
  validate_store(minimized, "minimized");
  component_subscribe($$self, minimized, (value) => $$invalidate(37, $minimized = value));
  const { resizeObservable } = application.position.stores;
  validate_store(resizeObservable, "resizeObservable");
  component_subscribe($$self, resizeObservable, (value) => $$invalidate(39, $resizeObservable = value));
  let { appOffsetHeight = false } = $$props;
  let { appOffsetWidth = false } = $$props;
  const initialAppResizeObserver = !!appOffsetHeight || !!appOffsetWidth;
  let { contentOffsetHeight = false } = $$props;
  let { contentOffsetWidth = false } = $$props;
  const contentResizeObserver = !!contentOffsetHeight || !!contentOffsetWidth ? resizeObserver : () => null;
  const internal = new AppShellContextInternal();
  const s_IGNORE_CLASSES = { ignoreClasses: ["tjs-focus-wrap"] };
  setContext("#internal", internal);
  let focusWrapEnabled;
  let { transition = TJSDefaultTransition.default } = $$props;
  let { inTransition = TJSDefaultTransition.default } = $$props;
  let { outTransition = TJSDefaultTransition.default } = $$props;
  let { transitionOptions = void 0 } = $$props;
  let { inTransitionOptions = TJSDefaultTransition.options } = $$props;
  let { outTransitionOptions = TJSDefaultTransition.options } = $$props;
  let oldTransition = TJSDefaultTransition.default;
  let oldTransitionOptions = void 0;
  const themeStore = ThemeObserver.stores.theme;
  validate_store(themeStore, "themeStore");
  component_subscribe($$self, themeStore, (value) => $$invalidate(36, $themeStore = value));
  let appClasses = "";
  let mounted = false;
  onMount(() => {
    if ($focusAuto) {
      elementRoot.focus();
    }
    requestAnimationFrame(() => $$invalidate(13, mounted = true));
  });
  function onClosePopup(event) {
    if (!$focusAuto) {
      return;
    }
    const targetEl = event?.detail?.target;
    if (!A11yHelper.isFocusTarget(targetEl)) {
      return;
    }
    if (A11yHelper.isFocusable(targetEl)) {
      return;
    }
    const elementRootContains = elementRoot.contains(targetEl);
    if (targetEl === elementRoot) {
      elementRoot.focus();
    } else if (targetEl === elementContent) {
      elementContent.focus();
    } else if (elementRootContains) {
      if (elementContent.contains(targetEl)) {
        elementContent.focus();
      } else {
        elementRoot.focus();
      }
    }
  }
  function onKeydown(event) {
    const FVTTKeyboardManager = foundry.helpers.interaction.KeyboardManager;
    if ((event.target === elementRoot || event.target === elementContent) && FVTTKeyboardManager && FVTTKeyboardManager?._getMatchingActions?.(FVTTKeyboardManager?.getKeyboardEventContext?.(event))?.length) {
      event.target?.blur();
      return;
    }
    if (focusWrapEnabled && event.shiftKey && event.code === "Tab") {
      const allFocusable = A11yHelper.getFocusableElements(elementRoot, s_IGNORE_CLASSES);
      const firstFocusEl = allFocusable.length > 0 ? allFocusable[0] : void 0;
      const lastFocusEl = allFocusable.length > 0 ? allFocusable[allFocusable.length - 1] : void 0;
      const activeWindow = application.reactive.activeWindow;
      if (elementRoot === activeWindow.document.activeElement || firstFocusEl === activeWindow.document.activeElement) {
        if (A11yHelper.isFocusTarget(lastFocusEl) && firstFocusEl !== lastFocusEl) {
          lastFocusEl.focus();
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
    application.bringToTop.call(application);
  }
  function onPointerdownApp() {
    application.bringToTop.call(application);
  }
  function onPointerdownContent(event) {
    const focusable = A11yHelper.isFocusable(event.target);
    if (!focusable && $focusAuto) {
      if ($focusKeep) {
        const activeWindow = application.reactive.activeWindow;
        const focusOutside = !elementRoot.contains(activeWindow.document.activeElement);
        if (focusOutside) {
          elementContent.focus();
        } else {
          event.preventDefault();
        }
      } else {
        elementContent.focus();
      }
    }
  }
  function resizeObservedContent(offsetWidth, offsetHeight) {
    $$invalidate(30, contentOffsetWidth = offsetWidth);
    $$invalidate(29, contentOffsetHeight = offsetHeight);
  }
  function resizeObservedApp(offsetWidth, offsetHeight, contentWidth, contentHeight) {
    application.position.stores.resizeObserved.update((object) => {
      object.contentWidth = contentWidth;
      object.contentHeight = contentHeight;
      object.offsetWidth = offsetWidth;
      object.offsetHeight = offsetHeight;
      return object;
    });
    $$invalidate(27, appOffsetHeight = offsetHeight);
    $$invalidate(28, appOffsetWidth = offsetWidth);
  }
  const writable_props = [
    "elementContent",
    "elementRoot",
    "draggable",
    "draggableOptions",
    "stylesApp",
    "stylesContent",
    "appOffsetHeight",
    "appOffsetWidth",
    "contentOffsetHeight",
    "contentOffsetWidth",
    "transition",
    "inTransition",
    "outTransition",
    "transitionOptions",
    "inTransitionOptions",
    "outTransitionOptions"
  ];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<ApplicationShell> was created with unknown prop '${key}'`);
  });
  function section_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementContent = $$value;
      $$invalidate(0, elementContent);
    });
  }
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementRoot = $$value;
      $$invalidate(1, elementRoot);
    });
  }
  function section_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementContent = $$value;
      $$invalidate(0, elementContent);
    });
  }
  function div_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementRoot = $$value;
      $$invalidate(1, elementRoot);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(0, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(1, elementRoot = $$props2.elementRoot);
    if ("draggable" in $$props2) $$invalidate(6, draggable2 = $$props2.draggable);
    if ("draggableOptions" in $$props2) $$invalidate(7, draggableOptions = $$props2.draggableOptions);
    if ("stylesApp" in $$props2) $$invalidate(8, stylesApp = $$props2.stylesApp);
    if ("stylesContent" in $$props2) $$invalidate(9, stylesContent = $$props2.stylesContent);
    if ("appOffsetHeight" in $$props2) $$invalidate(27, appOffsetHeight = $$props2.appOffsetHeight);
    if ("appOffsetWidth" in $$props2) $$invalidate(28, appOffsetWidth = $$props2.appOffsetWidth);
    if ("contentOffsetHeight" in $$props2) $$invalidate(29, contentOffsetHeight = $$props2.contentOffsetHeight);
    if ("contentOffsetWidth" in $$props2) $$invalidate(30, contentOffsetWidth = $$props2.contentOffsetWidth);
    if ("transition" in $$props2) $$invalidate(31, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(2, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(3, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(32, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(4, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(5, outTransitionOptions = $$props2.outTransitionOptions);
    if ("$$scope" in $$props2) $$invalidate(40, $$scope = $$props2.$$scope);
  };
  $$self.$capture_state = () => ({
    getContext,
    onMount,
    setContext,
    resizeObserver,
    applyStyles,
    dynamicAction,
    ThemeObserver,
    TJSDefaultTransition,
    A11yHelper,
    isObject,
    AppShellContextInternal,
    TJSApplicationHeader: TJSApplicationHeader_default,
    ResizableHandle: ResizableHandle_default,
    TJSFocusWrap: TJSFocusWrap_default,
    elementContent,
    elementRoot,
    draggable: draggable2,
    draggableOptions,
    stylesApp,
    stylesContent,
    application,
    focusAuto,
    focusKeep,
    focusTrap,
    minimized,
    resizeObservable,
    appOffsetHeight,
    appOffsetWidth,
    initialAppResizeObserver,
    contentOffsetHeight,
    contentOffsetWidth,
    contentResizeObserver,
    internal,
    s_IGNORE_CLASSES,
    focusWrapEnabled,
    transition,
    inTransition,
    outTransition,
    transitionOptions,
    inTransitionOptions,
    outTransitionOptions,
    oldTransition,
    oldTransitionOptions,
    themeStore,
    appClasses,
    mounted,
    onClosePopup,
    onKeydown,
    onPointerdownApp,
    onPointerdownContent,
    resizeObservedContent,
    resizeObservedApp,
    appResizeObserver,
    $focusKeep,
    $focusAuto,
    $themeStore,
    $minimized,
    $focusTrap,
    $resizeObservable
  });
  $$self.$inject_state = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(0, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(1, elementRoot = $$props2.elementRoot);
    if ("draggable" in $$props2) $$invalidate(6, draggable2 = $$props2.draggable);
    if ("draggableOptions" in $$props2) $$invalidate(7, draggableOptions = $$props2.draggableOptions);
    if ("stylesApp" in $$props2) $$invalidate(8, stylesApp = $$props2.stylesApp);
    if ("stylesContent" in $$props2) $$invalidate(9, stylesContent = $$props2.stylesContent);
    if ("appOffsetHeight" in $$props2) $$invalidate(27, appOffsetHeight = $$props2.appOffsetHeight);
    if ("appOffsetWidth" in $$props2) $$invalidate(28, appOffsetWidth = $$props2.appOffsetWidth);
    if ("contentOffsetHeight" in $$props2) $$invalidate(29, contentOffsetHeight = $$props2.contentOffsetHeight);
    if ("contentOffsetWidth" in $$props2) $$invalidate(30, contentOffsetWidth = $$props2.contentOffsetWidth);
    if ("focusWrapEnabled" in $$props2) $$invalidate(11, focusWrapEnabled = $$props2.focusWrapEnabled);
    if ("transition" in $$props2) $$invalidate(31, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(2, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(3, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(32, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(4, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(5, outTransitionOptions = $$props2.outTransitionOptions);
    if ("oldTransition" in $$props2) $$invalidate(33, oldTransition = $$props2.oldTransition);
    if ("oldTransitionOptions" in $$props2) $$invalidate(34, oldTransitionOptions = $$props2.oldTransitionOptions);
    if ("appClasses" in $$props2) $$invalidate(12, appClasses = $$props2.appClasses);
    if ("mounted" in $$props2) $$invalidate(13, mounted = $$props2.mounted);
    if ("appResizeObserver" in $$props2) $$invalidate(14, appResizeObserver = $$props2.appResizeObserver);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty[1] & /*$resizeObservable*/
    256) {
      $: $$invalidate(14, appResizeObserver = initialAppResizeObserver || $resizeObservable ? {
        action: resizeObserver,
        data: resizeObservedApp
      } : void 0);
    }
    if ($$self.$$.dirty[0] & /*elementContent*/
    1) {
      $: if (elementContent !== void 0 && elementContent !== null) {
        getContext("#internal").stores.elementContent.set(elementContent);
      }
    }
    if ($$self.$$.dirty[0] & /*elementRoot*/
    2) {
      $: if (elementRoot !== void 0 && elementRoot !== null) {
        getContext("#internal").stores.elementRoot.set(elementRoot);
      }
    }
    if ($$self.$$.dirty[1] & /*$focusAuto, $focusTrap, $minimized*/
    208) {
      $: $$invalidate(11, focusWrapEnabled = $focusAuto && $focusTrap && !$minimized);
    }
    if ($$self.$$.dirty[1] & /*oldTransition, transition*/
    5) {
      $: if (oldTransition !== transition) {
        const newTransition = typeof transition === "function" ? transition : TJSDefaultTransition.default;
        $$invalidate(2, inTransition = newTransition);
        $$invalidate(3, outTransition = newTransition);
        $$invalidate(33, oldTransition = newTransition);
      }
    }
    if ($$self.$$.dirty[1] & /*oldTransitionOptions, transitionOptions*/
    10) {
      $: if (oldTransitionOptions !== transitionOptions) {
        const newOptions = transitionOptions !== TJSDefaultTransition.options && isObject(transitionOptions) ? transitionOptions : TJSDefaultTransition.options;
        $$invalidate(4, inTransitionOptions = newOptions);
        $$invalidate(5, outTransitionOptions = newOptions);
        $$invalidate(34, oldTransitionOptions = newOptions);
      }
    }
    if ($$self.$$.dirty[0] & /*inTransition*/
    4) {
      $: if (typeof inTransition !== "function") {
        $$invalidate(2, inTransition = TJSDefaultTransition.default);
      }
    }
    if ($$self.$$.dirty[0] & /*outTransition, application*/
    1032) {
      $: {
        if (typeof outTransition !== "function") {
          $$invalidate(3, outTransition = TJSDefaultTransition.default);
        }
        const defaultCloseAnimation = application?.options?.defaultCloseAnimation;
        if (typeof defaultCloseAnimation === "boolean" && defaultCloseAnimation && outTransition !== TJSDefaultTransition.default) {
          $$invalidate(10, application.options.defaultCloseAnimation = false, application);
        }
      }
    }
    if ($$self.$$.dirty[0] & /*inTransitionOptions*/
    16) {
      $: if (!isObject(inTransitionOptions)) {
        $$invalidate(4, inTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty[0] & /*outTransitionOptions*/
    32) {
      $: if (!isObject(outTransitionOptions)) {
        $$invalidate(5, outTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty[0] & /*application*/
    1024 | $$self.$$.dirty[1] & /*$themeStore*/
    32) {
      $: if ($themeStore) {
        $$invalidate(12, appClasses = ThemeObserver.appClasses(application));
      }
    }
  };
  return [
    elementContent,
    elementRoot,
    inTransition,
    outTransition,
    inTransitionOptions,
    outTransitionOptions,
    draggable2,
    draggableOptions,
    stylesApp,
    stylesContent,
    application,
    focusWrapEnabled,
    appClasses,
    mounted,
    appResizeObserver,
    focusAuto,
    focusKeep,
    focusTrap,
    minimized,
    resizeObservable,
    contentResizeObserver,
    themeStore,
    onClosePopup,
    onKeydown,
    onPointerdownApp,
    onPointerdownContent,
    resizeObservedContent,
    appOffsetHeight,
    appOffsetWidth,
    contentOffsetHeight,
    contentOffsetWidth,
    transition,
    transitionOptions,
    oldTransition,
    oldTransitionOptions,
    $focusAuto,
    $themeStore,
    $minimized,
    $focusTrap,
    $resizeObservable,
    $$scope,
    slots,
    section_binding,
    div_binding,
    section_binding_1,
    div_binding_1
  ];
}
var ApplicationShell = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(
      this,
      options,
      instance7,
      create_fragment7,
      safe_not_equal,
      {
        elementContent: 0,
        elementRoot: 1,
        draggable: 6,
        draggableOptions: 7,
        stylesApp: 8,
        stylesContent: 9,
        appOffsetHeight: 27,
        appOffsetWidth: 28,
        contentOffsetHeight: 29,
        contentOffsetWidth: 30,
        transition: 31,
        inTransition: 2,
        outTransition: 3,
        transitionOptions: 32,
        inTransitionOptions: 4,
        outTransitionOptions: 5
      },
      add_css6,
      [-1, -1]
    );
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "ApplicationShell",
      options,
      id: create_fragment7.name
    });
  }
  get elementContent() {
    return this.$$.ctx[0];
  }
  set elementContent(elementContent) {
    this.$$set({ elementContent });
    flush();
  }
  get elementRoot() {
    return this.$$.ctx[1];
  }
  set elementRoot(elementRoot) {
    this.$$set({ elementRoot });
    flush();
  }
  get draggable() {
    return this.$$.ctx[6];
  }
  set draggable(draggable2) {
    this.$$set({ draggable: draggable2 });
    flush();
  }
  get draggableOptions() {
    return this.$$.ctx[7];
  }
  set draggableOptions(draggableOptions) {
    this.$$set({ draggableOptions });
    flush();
  }
  get stylesApp() {
    return this.$$.ctx[8];
  }
  set stylesApp(stylesApp) {
    this.$$set({ stylesApp });
    flush();
  }
  get stylesContent() {
    return this.$$.ctx[9];
  }
  set stylesContent(stylesContent) {
    this.$$set({ stylesContent });
    flush();
  }
  get appOffsetHeight() {
    return this.$$.ctx[27];
  }
  set appOffsetHeight(appOffsetHeight) {
    this.$$set({ appOffsetHeight });
    flush();
  }
  get appOffsetWidth() {
    return this.$$.ctx[28];
  }
  set appOffsetWidth(appOffsetWidth) {
    this.$$set({ appOffsetWidth });
    flush();
  }
  get contentOffsetHeight() {
    return this.$$.ctx[29];
  }
  set contentOffsetHeight(contentOffsetHeight) {
    this.$$set({ contentOffsetHeight });
    flush();
  }
  get contentOffsetWidth() {
    return this.$$.ctx[30];
  }
  set contentOffsetWidth(contentOffsetWidth) {
    this.$$set({ contentOffsetWidth });
    flush();
  }
  get transition() {
    return this.$$.ctx[31];
  }
  set transition(transition) {
    this.$$set({ transition });
    flush();
  }
  get inTransition() {
    return this.$$.ctx[2];
  }
  set inTransition(inTransition) {
    this.$$set({ inTransition });
    flush();
  }
  get outTransition() {
    return this.$$.ctx[3];
  }
  set outTransition(outTransition) {
    this.$$set({ outTransition });
    flush();
  }
  get transitionOptions() {
    return this.$$.ctx[32];
  }
  set transitionOptions(transitionOptions) {
    this.$$set({ transitionOptions });
    flush();
  }
  get inTransitionOptions() {
    return this.$$.ctx[4];
  }
  set inTransitionOptions(inTransitionOptions) {
    this.$$set({ inTransitionOptions });
    flush();
  }
  get outTransitionOptions() {
    return this.$$.ctx[5];
  }
  set outTransitionOptions(outTransitionOptions) {
    this.$$set({ outTransitionOptions });
    flush();
  }
};
var ApplicationShell_default = ApplicationShell;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/EmptyApplicationShell.svelte
var file7 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/EmptyApplicationShell.svelte";
function add_css7(target) {
  append_styles(target, "svelte-1fyxv4t", ".application.svelte-1fyxv4t{max-width:var(--tjs-app-max-width, unset);max-height:var(--tjs-app-max-height, unset);min-width:var(--tjs-app-min-width, unset);min-height:var(--tjs-app-min-height, unset);overflow:var(--tjs-app-overflow, hidden);scrollbar-width:var(--tjs-app-scrollbar-width, inherit);scrollbar-color:var(--tjs-app-scrollbar-color, inherit)}.application.mounted.svelte-1fyxv4t{container:tjs-app-window / inline-size}div.svelte-1fyxv4t{contain:layout style paint;display:var(--tjs-app-display, flex);flex-direction:var(--tjs-app-flex-direction, column);flex-wrap:var(--tjs-app-flex-wrap, nowrap);justify-content:var(--tjs-app-justify-content, flex-start);gap:var(--tjs-app-content-gap);background:var(--tjs-empty-app-background, none);border-radius:var(--tjs-app-border-radius, 6px);box-shadow:var(--tjs-app-box-shadow, none);color:var(--tjs-app-color, inherit);margin:var(--tjs-app-margin, 0);overflow:var(--tjs-app-overflow, hidden);padding:var(--tjs-app-padding, 0);position:var(--tjs-app-position, absolute)}div.mounted.svelte-1fyxv4t{container:tjs-app-window-content / inline-size}div.svelte-1fyxv4t:focus-visible{outline:var(--tjs-app-outline-focus-visible, var(--tjs-default-a11y-outline-focus-visible, 2px solid transparent))}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW1wdHlBcHBsaWNhdGlvblNoZWxsLnN2ZWx0ZSIsIm1hcHBpbmdzIjoiQUF5YUcsNEJBQ0cseUNBQTBDLENBQzFDLDJDQUE0QyxDQUU1Qyx5Q0FBMEMsQ0FDMUMsMkNBQTRDLENBRTVDLHdDQUF5QyxDQUV6Qyx1REFBd0QsQ0FDeEQsdURBQ0gsQ0FHQSxvQ0FDRyxzQ0FDSCxDQUVBLG1CQUNHLDBCQUEyQixDQUUzQixvQ0FBcUMsQ0FDckMsb0RBQXFELENBQ3JELDBDQUEyQyxDQUMzQywwREFBMkQsQ0FDM0QsOEJBQStCLENBRS9CLGdEQUFpRCxDQUNqRCwrQ0FBZ0QsQ0FDaEQsMENBQTJDLENBRTNDLG1DQUFvQyxDQUNwQywrQkFBZ0MsQ0FDaEMsd0NBQXlDLENBQ3pDLGlDQUFrQyxDQUNsQywwQ0FDSCxDQUdBLDJCQUNHLDhDQUNILENBRUEsaUNBQ0csa0hBQ0giLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkVtcHR5QXBwbGljYXRpb25TaGVsbC5zdmVsdGUiXX0= */");
}
function create_else_block3(ctx) {
  let div;
  let t0;
  let resizablehandle;
  let t1;
  let tjsfocuswrap;
  let div_id_value;
  let div_class_value;
  let div_data_appid_value;
  let applyStyles_action;
  let dynamicAction_action;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[34].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[33],
    null
  );
  resizablehandle = new ResizableHandle_default({ $$inline: true });
  tjsfocuswrap = new TJSFocusWrap_default({
    props: {
      elementRoot: (
        /*elementRoot*/
        ctx[0]
      ),
      enabled: (
        /*focusWrapEnabled*/
        ctx[7]
      )
    },
    $$inline: true
  });
  const block = {
    c: function create() {
      div = element("div");
      if (default_slot) default_slot.c();
      t0 = space();
      create_component(resizablehandle.$$.fragment);
      t1 = space();
      create_component(tjsfocuswrap.$$.fragment);
      attr_dev(div, "id", div_id_value = /*application*/
      ctx[6].id);
      attr_dev(div, "class", div_class_value = "application " + /*appClasses*/
      ctx[8] + " svelte-1fyxv4t");
      attr_dev(div, "data-appid", div_data_appid_value = /*application*/
      ctx[6].appId);
      attr_dev(div, "role", "application");
      attr_dev(div, "tabindex", "-1");
      toggle_class(
        div,
        "mounted",
        /*mounted*/
        ctx[9]
      );
      add_location(div, file7, 404, 4, 17164);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      if (default_slot) {
        default_slot.m(div, null);
      }
      append_dev(div, t0);
      mount_component(resizablehandle, div, null);
      append_dev(div, t1);
      mount_component(tjsfocuswrap, div, null);
      ctx[36](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(div, "close:popup", stop_propagation(prevent_default(
            /*onClosePopup*/
            ctx[17]
          )), false, true, true, false),
          listen_dev(
            div,
            "keydown",
            /*onKeydown*/
            ctx[18],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownAppTopMost*/
            ctx[20],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownApp*/
            ctx[19],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            div,
            /*stylesApp*/
            ctx[5]
          )),
          action_destroyer(dynamicAction_action = dynamicAction.call(
            null,
            div,
            /*appResizeObserver*/
            ctx[10]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, dirty) {
      if (default_slot) {
        if (default_slot.p && (!current || dirty[1] & /*$$scope*/
        4)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[33],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[33]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[33],
              dirty,
              null
            ),
            null
          );
        }
      }
      const tjsfocuswrap_changes = {};
      if (dirty[0] & /*elementRoot*/
      1) tjsfocuswrap_changes.elementRoot = /*elementRoot*/
      ctx2[0];
      if (dirty[0] & /*focusWrapEnabled*/
      128) tjsfocuswrap_changes.enabled = /*focusWrapEnabled*/
      ctx2[7];
      tjsfocuswrap.$set(tjsfocuswrap_changes);
      if (!current || dirty[0] & /*application*/
      64 && div_id_value !== (div_id_value = /*application*/
      ctx2[6].id)) {
        attr_dev(div, "id", div_id_value);
      }
      if (!current || dirty[0] & /*appClasses*/
      256 && div_class_value !== (div_class_value = "application " + /*appClasses*/
      ctx2[8] + " svelte-1fyxv4t")) {
        attr_dev(div, "class", div_class_value);
      }
      if (!current || dirty[0] & /*application*/
      64 && div_data_appid_value !== (div_data_appid_value = /*application*/
      ctx2[6].appId)) {
        attr_dev(div, "data-appid", div_data_appid_value);
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*stylesApp*/
      32) applyStyles_action.update.call(
        null,
        /*stylesApp*/
        ctx2[5]
      );
      if (dynamicAction_action && is_function(dynamicAction_action.update) && dirty[0] & /*appResizeObserver*/
      1024) dynamicAction_action.update.call(
        null,
        /*appResizeObserver*/
        ctx2[10]
      );
      if (!current || dirty[0] & /*appClasses, mounted*/
      768) {
        toggle_class(
          div,
          "mounted",
          /*mounted*/
          ctx2[9]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(default_slot, local);
      transition_in(resizablehandle.$$.fragment, local);
      transition_in(tjsfocuswrap.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(default_slot, local);
      transition_out(resizablehandle.$$.fragment, local);
      transition_out(tjsfocuswrap.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      if (default_slot) default_slot.d(detaching);
      destroy_component(resizablehandle);
      destroy_component(tjsfocuswrap);
      ctx[36](null);
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_else_block3.name,
    type: "else",
    source: "(403:0) {:else}",
    ctx
  });
  return block;
}
function create_if_block5(ctx) {
  let div;
  let t0;
  let resizablehandle;
  let t1;
  let tjsfocuswrap;
  let div_id_value;
  let div_class_value;
  let div_data_appid_value;
  let applyStyles_action;
  let dynamicAction_action;
  let div_intro;
  let div_outro;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[34].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[33],
    null
  );
  resizablehandle = new ResizableHandle_default({ $$inline: true });
  tjsfocuswrap = new TJSFocusWrap_default({
    props: {
      elementRoot: (
        /*elementRoot*/
        ctx[0]
      ),
      enabled: (
        /*focusWrapEnabled*/
        ctx[7]
      )
    },
    $$inline: true
  });
  const block = {
    c: function create() {
      div = element("div");
      if (default_slot) default_slot.c();
      t0 = space();
      create_component(resizablehandle.$$.fragment);
      t1 = space();
      create_component(tjsfocuswrap.$$.fragment);
      attr_dev(div, "id", div_id_value = /*application*/
      ctx[6].id);
      attr_dev(div, "class", div_class_value = "application " + /*appClasses*/
      ctx[8] + " svelte-1fyxv4t");
      attr_dev(div, "data-appid", div_data_appid_value = /*application*/
      ctx[6].appId);
      attr_dev(div, "role", "application");
      attr_dev(div, "tabindex", "-1");
      toggle_class(
        div,
        "mounted",
        /*mounted*/
        ctx[9]
      );
      add_location(div, file7, 383, 4, 16319);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      if (default_slot) {
        default_slot.m(div, null);
      }
      append_dev(div, t0);
      mount_component(resizablehandle, div, null);
      append_dev(div, t1);
      mount_component(tjsfocuswrap, div, null);
      ctx[35](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(div, "close:popup", stop_propagation(prevent_default(
            /*onClosePopup*/
            ctx[17]
          )), false, true, true, false),
          listen_dev(
            div,
            "keydown",
            /*onKeydown*/
            ctx[18],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownAppTopMost*/
            ctx[20],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownApp*/
            ctx[19],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            div,
            /*stylesApp*/
            ctx[5]
          )),
          action_destroyer(dynamicAction_action = dynamicAction.call(
            null,
            div,
            /*appResizeObserver*/
            ctx[10]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(new_ctx, dirty) {
      ctx = new_ctx;
      if (default_slot) {
        if (default_slot.p && (!current || dirty[1] & /*$$scope*/
        4)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx,
            /*$$scope*/
            ctx[33],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx[33]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx[33],
              dirty,
              null
            ),
            null
          );
        }
      }
      const tjsfocuswrap_changes = {};
      if (dirty[0] & /*elementRoot*/
      1) tjsfocuswrap_changes.elementRoot = /*elementRoot*/
      ctx[0];
      if (dirty[0] & /*focusWrapEnabled*/
      128) tjsfocuswrap_changes.enabled = /*focusWrapEnabled*/
      ctx[7];
      tjsfocuswrap.$set(tjsfocuswrap_changes);
      if (!current || dirty[0] & /*application*/
      64 && div_id_value !== (div_id_value = /*application*/
      ctx[6].id)) {
        attr_dev(div, "id", div_id_value);
      }
      if (!current || dirty[0] & /*appClasses*/
      256 && div_class_value !== (div_class_value = "application " + /*appClasses*/
      ctx[8] + " svelte-1fyxv4t")) {
        attr_dev(div, "class", div_class_value);
      }
      if (!current || dirty[0] & /*application*/
      64 && div_data_appid_value !== (div_data_appid_value = /*application*/
      ctx[6].appId)) {
        attr_dev(div, "data-appid", div_data_appid_value);
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*stylesApp*/
      32) applyStyles_action.update.call(
        null,
        /*stylesApp*/
        ctx[5]
      );
      if (dynamicAction_action && is_function(dynamicAction_action.update) && dirty[0] & /*appResizeObserver*/
      1024) dynamicAction_action.update.call(
        null,
        /*appResizeObserver*/
        ctx[10]
      );
      if (!current || dirty[0] & /*appClasses, mounted*/
      768) {
        toggle_class(
          div,
          "mounted",
          /*mounted*/
          ctx[9]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(default_slot, local);
      transition_in(resizablehandle.$$.fragment, local);
      transition_in(tjsfocuswrap.$$.fragment, local);
      add_render_callback(() => {
        if (!current) return;
        if (div_outro) div_outro.end(1);
        div_intro = create_in_transition(
          div,
          /*inTransition*/
          ctx[1],
          /*inTransitionOptions*/
          ctx[3]
        );
        div_intro.start();
      });
      current = true;
    },
    o: function outro(local) {
      transition_out(default_slot, local);
      transition_out(resizablehandle.$$.fragment, local);
      transition_out(tjsfocuswrap.$$.fragment, local);
      if (div_intro) div_intro.invalidate();
      div_outro = create_out_transition(
        div,
        /*outTransition*/
        ctx[2],
        /*outTransitionOptions*/
        ctx[4]
      );
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      if (default_slot) default_slot.d(detaching);
      destroy_component(resizablehandle);
      destroy_component(tjsfocuswrap);
      ctx[35](null);
      if (detaching && div_outro) div_outro.end();
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block5.name,
    type: "if",
    source: "(382:0) {#if inTransition !== TJSDefaultTransition.default || outTransition !== TJSDefaultTransition.default}",
    ctx
  });
  return block;
}
function create_fragment8(ctx) {
  let current_block_type_index;
  let if_block;
  let if_block_anchor;
  let current;
  const if_block_creators = [create_if_block5, create_else_block3];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*inTransition*/
      ctx2[1] !== TJSDefaultTransition.default || /*outTransition*/
      ctx2[2] !== TJSDefaultTransition.default
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx, [-1, -1]);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  const block = {
    c: function create() {
      if_block.c();
      if_block_anchor = empty();
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      if_blocks[current_block_type_index].m(target, anchor);
      insert_dev(target, if_block_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2, dirty);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(if_block_anchor.parentNode, if_block_anchor);
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o: function outro(local) {
      transition_out(if_block);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(if_block_anchor);
      }
      if_blocks[current_block_type_index].d(detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment8.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance8($$self, $$props, $$invalidate) {
  let appResizeObserver;
  let $focusKeep;
  let $focusAuto;
  let $themeStore;
  let $minimized;
  let $focusTrap;
  let $resizeObservable;
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("EmptyApplicationShell", slots, ["default"]);
  let { elementContent = void 0 } = $$props;
  let { elementRoot = void 0 } = $$props;
  let { stylesApp = void 0 } = $$props;
  const application = getContext("#external")?.application;
  const { focusAuto, focusKeep, focusTrap } = application.reactive.storeAppOptions;
  validate_store(focusAuto, "focusAuto");
  component_subscribe($$self, focusAuto, (value) => $$invalidate(28, $focusAuto = value));
  validate_store(focusKeep, "focusKeep");
  component_subscribe($$self, focusKeep, (value) => $$invalidate(37, $focusKeep = value));
  validate_store(focusTrap, "focusTrap");
  component_subscribe($$self, focusTrap, (value) => $$invalidate(31, $focusTrap = value));
  const { minimized } = application.reactive.storeUIState;
  validate_store(minimized, "minimized");
  component_subscribe($$self, minimized, (value) => $$invalidate(30, $minimized = value));
  const { resizeObservable } = application.position.stores;
  validate_store(resizeObservable, "resizeObservable");
  component_subscribe($$self, resizeObservable, (value) => $$invalidate(32, $resizeObservable = value));
  let { appOffsetHeight = false } = $$props;
  let { appOffsetWidth = false } = $$props;
  const initialAppResizeObserver = !!appOffsetHeight || !!appOffsetWidth;
  const internal = new AppShellContextInternal();
  const s_IGNORE_CLASSES = { ignoreClasses: ["tjs-focus-wrap"] };
  setContext("#internal", internal);
  let focusWrapEnabled;
  let { transition = TJSDefaultTransition.default } = $$props;
  let { inTransition = TJSDefaultTransition.default } = $$props;
  let { outTransition = TJSDefaultTransition.default } = $$props;
  let { transitionOptions = void 0 } = $$props;
  let { inTransitionOptions = TJSDefaultTransition.options } = $$props;
  let { outTransitionOptions = TJSDefaultTransition.options } = $$props;
  let oldTransition = TJSDefaultTransition.default;
  let oldTransitionOptions = void 0;
  const themeStore = ThemeObserver.stores.theme;
  validate_store(themeStore, "themeStore");
  component_subscribe($$self, themeStore, (value) => $$invalidate(29, $themeStore = value));
  let appClasses = "";
  let mounted = false;
  onMount(() => {
    if ($focusAuto) {
      elementRoot.focus();
    }
    requestAnimationFrame(() => $$invalidate(9, mounted = true));
  });
  function onClosePopup(event) {
    if (!$focusAuto) {
      return;
    }
    const targetEl = event?.detail?.target;
    if (!A11yHelper.isFocusTarget(targetEl)) {
      return;
    }
    if (A11yHelper.isFocusable(targetEl)) {
      return;
    }
    const elementRootContains = elementRoot.contains(targetEl);
    if (targetEl === elementRoot) {
      elementRoot.focus();
    } else if (targetEl === elementContent) {
      elementContent.focus();
    } else if (elementRootContains) {
      if (elementContent.contains(targetEl)) {
        elementContent.focus();
      } else {
        elementRoot.focus();
      }
    }
  }
  function onKeydown(event) {
    const FVTTKeyboardManager = foundry.helpers.interaction.KeyboardManager;
    if ((event.target === elementRoot || event.target === elementContent) && FVTTKeyboardManager && FVTTKeyboardManager?._getMatchingActions?.(FVTTKeyboardManager?.getKeyboardEventContext?.(event))?.length) {
      event.target?.blur();
      return;
    }
    if (focusWrapEnabled && event.shiftKey && event.code === "Tab") {
      const allFocusable = A11yHelper.getFocusableElements(elementRoot, s_IGNORE_CLASSES);
      const firstFocusEl = allFocusable.length > 0 ? allFocusable[0] : void 0;
      const lastFocusEl = allFocusable.length > 0 ? allFocusable[allFocusable.length - 1] : void 0;
      const activeWindow = application.reactive.activeWindow;
      if (elementRoot === activeWindow.document.activeElement || firstFocusEl === activeWindow.document.activeElement) {
        if (A11yHelper.isFocusTarget(lastFocusEl) && firstFocusEl !== lastFocusEl) {
          lastFocusEl.focus();
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
    application.bringToTop.call(application);
  }
  function onPointerdownApp(event) {
    const focusable = A11yHelper.isFocusable(event.target);
    if (!focusable && $focusAuto) {
      if ($focusKeep) {
        const activeWindow = application.reactive.activeWindow;
        const focusOutside = !elementRoot.contains(activeWindow.document.activeElement);
        if (focusOutside) {
          elementRoot.focus();
        } else {
          event.preventDefault();
        }
      } else {
        elementRoot.focus();
      }
    }
  }
  function onPointerdownAppTopMost() {
    application.bringToTop.call(application);
  }
  function resizeObservedApp(offsetWidth, offsetHeight, contentWidth, contentHeight) {
    application.position.stores.resizeObserved.update((object) => {
      object.contentWidth = contentWidth;
      object.contentHeight = contentHeight;
      object.offsetWidth = offsetWidth;
      object.offsetHeight = offsetHeight;
      return object;
    });
    $$invalidate(22, appOffsetHeight = offsetHeight);
    $$invalidate(23, appOffsetWidth = offsetWidth);
  }
  const writable_props = [
    "elementContent",
    "elementRoot",
    "stylesApp",
    "appOffsetHeight",
    "appOffsetWidth",
    "transition",
    "inTransition",
    "outTransition",
    "transitionOptions",
    "inTransitionOptions",
    "outTransitionOptions"
  ];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<EmptyApplicationShell> was created with unknown prop '${key}'`);
  });
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementRoot = $$value;
      $$invalidate(0, elementRoot);
    });
  }
  function div_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementRoot = $$value;
      $$invalidate(0, elementRoot);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(21, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(0, elementRoot = $$props2.elementRoot);
    if ("stylesApp" in $$props2) $$invalidate(5, stylesApp = $$props2.stylesApp);
    if ("appOffsetHeight" in $$props2) $$invalidate(22, appOffsetHeight = $$props2.appOffsetHeight);
    if ("appOffsetWidth" in $$props2) $$invalidate(23, appOffsetWidth = $$props2.appOffsetWidth);
    if ("transition" in $$props2) $$invalidate(24, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(1, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(2, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(25, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(3, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(4, outTransitionOptions = $$props2.outTransitionOptions);
    if ("$$scope" in $$props2) $$invalidate(33, $$scope = $$props2.$$scope);
  };
  $$self.$capture_state = () => ({
    getContext,
    onMount,
    setContext,
    resizeObserver,
    applyStyles,
    dynamicAction,
    ThemeObserver,
    TJSDefaultTransition,
    A11yHelper,
    isObject,
    AppShellContextInternal,
    ResizableHandle: ResizableHandle_default,
    TJSFocusWrap: TJSFocusWrap_default,
    elementContent,
    elementRoot,
    stylesApp,
    application,
    focusAuto,
    focusKeep,
    focusTrap,
    minimized,
    resizeObservable,
    appOffsetHeight,
    appOffsetWidth,
    initialAppResizeObserver,
    internal,
    s_IGNORE_CLASSES,
    focusWrapEnabled,
    transition,
    inTransition,
    outTransition,
    transitionOptions,
    inTransitionOptions,
    outTransitionOptions,
    oldTransition,
    oldTransitionOptions,
    themeStore,
    appClasses,
    mounted,
    onClosePopup,
    onKeydown,
    onPointerdownApp,
    onPointerdownAppTopMost,
    resizeObservedApp,
    appResizeObserver,
    $focusKeep,
    $focusAuto,
    $themeStore,
    $minimized,
    $focusTrap,
    $resizeObservable
  });
  $$self.$inject_state = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(21, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(0, elementRoot = $$props2.elementRoot);
    if ("stylesApp" in $$props2) $$invalidate(5, stylesApp = $$props2.stylesApp);
    if ("appOffsetHeight" in $$props2) $$invalidate(22, appOffsetHeight = $$props2.appOffsetHeight);
    if ("appOffsetWidth" in $$props2) $$invalidate(23, appOffsetWidth = $$props2.appOffsetWidth);
    if ("focusWrapEnabled" in $$props2) $$invalidate(7, focusWrapEnabled = $$props2.focusWrapEnabled);
    if ("transition" in $$props2) $$invalidate(24, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(1, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(2, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(25, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(3, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(4, outTransitionOptions = $$props2.outTransitionOptions);
    if ("oldTransition" in $$props2) $$invalidate(26, oldTransition = $$props2.oldTransition);
    if ("oldTransitionOptions" in $$props2) $$invalidate(27, oldTransitionOptions = $$props2.oldTransitionOptions);
    if ("appClasses" in $$props2) $$invalidate(8, appClasses = $$props2.appClasses);
    if ("mounted" in $$props2) $$invalidate(9, mounted = $$props2.mounted);
    if ("appResizeObserver" in $$props2) $$invalidate(10, appResizeObserver = $$props2.appResizeObserver);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty[1] & /*$resizeObservable*/
    2) {
      $: $$invalidate(10, appResizeObserver = initialAppResizeObserver || $resizeObservable ? {
        action: resizeObserver,
        data: resizeObservedApp
      } : void 0);
    }
    if ($$self.$$.dirty[0] & /*elementRoot*/
    1) {
      $: if (elementRoot) {
        $$invalidate(21, elementContent = elementRoot);
      }
    }
    if ($$self.$$.dirty[0] & /*elementContent*/
    2097152) {
      $: if (elementContent !== void 0 && elementContent !== null) {
        getContext("#internal").stores.elementContent.set(elementContent);
      }
    }
    if ($$self.$$.dirty[0] & /*elementRoot*/
    1) {
      $: if (elementRoot !== void 0 && elementRoot !== null) {
        getContext("#internal").stores.elementRoot.set(elementRoot);
      }
    }
    if ($$self.$$.dirty[0] & /*$focusAuto, $minimized*/
    1342177280 | $$self.$$.dirty[1] & /*$focusTrap*/
    1) {
      $: $$invalidate(7, focusWrapEnabled = $focusAuto && $focusTrap && !$minimized);
    }
    if ($$self.$$.dirty[0] & /*oldTransition, transition*/
    83886080) {
      $: if (oldTransition !== transition) {
        const newTransition = typeof transition === "function" ? transition : TJSDefaultTransition.default;
        $$invalidate(1, inTransition = newTransition);
        $$invalidate(2, outTransition = newTransition);
        $$invalidate(26, oldTransition = newTransition);
      }
    }
    if ($$self.$$.dirty[0] & /*oldTransitionOptions, transitionOptions*/
    167772160) {
      $: if (oldTransitionOptions !== transitionOptions) {
        const newOptions = transitionOptions !== TJSDefaultTransition.options && isObject(transitionOptions) ? transitionOptions : TJSDefaultTransition.options;
        $$invalidate(3, inTransitionOptions = newOptions);
        $$invalidate(4, outTransitionOptions = newOptions);
        $$invalidate(27, oldTransitionOptions = newOptions);
      }
    }
    if ($$self.$$.dirty[0] & /*inTransition*/
    2) {
      $: if (typeof inTransition !== "function") {
        $$invalidate(1, inTransition = TJSDefaultTransition.default);
      }
    }
    if ($$self.$$.dirty[0] & /*outTransition, application*/
    68) {
      $: {
        if (typeof outTransition !== "function") {
          $$invalidate(2, outTransition = TJSDefaultTransition.default);
        }
        const defaultCloseAnimation = application?.options?.defaultCloseAnimation;
        if (typeof defaultCloseAnimation === "boolean" && defaultCloseAnimation && outTransition !== TJSDefaultTransition.default) {
          $$invalidate(6, application.options.defaultCloseAnimation = false, application);
        }
      }
    }
    if ($$self.$$.dirty[0] & /*inTransitionOptions*/
    8) {
      $: if (!isObject(inTransitionOptions)) {
        $$invalidate(3, inTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty[0] & /*outTransitionOptions*/
    16) {
      $: if (!isObject(outTransitionOptions)) {
        $$invalidate(4, outTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty[0] & /*$themeStore, application*/
    536870976) {
      $: if ($themeStore) {
        $$invalidate(8, appClasses = ThemeObserver.appClasses(application, { hasThemed: true }));
      }
    }
  };
  return [
    elementRoot,
    inTransition,
    outTransition,
    inTransitionOptions,
    outTransitionOptions,
    stylesApp,
    application,
    focusWrapEnabled,
    appClasses,
    mounted,
    appResizeObserver,
    focusAuto,
    focusKeep,
    focusTrap,
    minimized,
    resizeObservable,
    themeStore,
    onClosePopup,
    onKeydown,
    onPointerdownApp,
    onPointerdownAppTopMost,
    elementContent,
    appOffsetHeight,
    appOffsetWidth,
    transition,
    transitionOptions,
    oldTransition,
    oldTransitionOptions,
    $focusAuto,
    $themeStore,
    $minimized,
    $focusTrap,
    $resizeObservable,
    $$scope,
    slots,
    div_binding,
    div_binding_1
  ];
}
var EmptyApplicationShell = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(
      this,
      options,
      instance8,
      create_fragment8,
      safe_not_equal,
      {
        elementContent: 21,
        elementRoot: 0,
        stylesApp: 5,
        appOffsetHeight: 22,
        appOffsetWidth: 23,
        transition: 24,
        inTransition: 1,
        outTransition: 2,
        transitionOptions: 25,
        inTransitionOptions: 3,
        outTransitionOptions: 4
      },
      add_css7,
      [-1, -1]
    );
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "EmptyApplicationShell",
      options,
      id: create_fragment8.name
    });
  }
  get elementContent() {
    return this.$$.ctx[21];
  }
  set elementContent(elementContent) {
    this.$$set({ elementContent });
    flush();
  }
  get elementRoot() {
    return this.$$.ctx[0];
  }
  set elementRoot(elementRoot) {
    this.$$set({ elementRoot });
    flush();
  }
  get stylesApp() {
    return this.$$.ctx[5];
  }
  set stylesApp(stylesApp) {
    this.$$set({ stylesApp });
    flush();
  }
  get appOffsetHeight() {
    return this.$$.ctx[22];
  }
  set appOffsetHeight(appOffsetHeight) {
    this.$$set({ appOffsetHeight });
    flush();
  }
  get appOffsetWidth() {
    return this.$$.ctx[23];
  }
  set appOffsetWidth(appOffsetWidth) {
    this.$$set({ appOffsetWidth });
    flush();
  }
  get transition() {
    return this.$$.ctx[24];
  }
  set transition(transition) {
    this.$$set({ transition });
    flush();
  }
  get inTransition() {
    return this.$$.ctx[1];
  }
  set inTransition(inTransition) {
    this.$$set({ inTransition });
    flush();
  }
  get outTransition() {
    return this.$$.ctx[2];
  }
  set outTransition(outTransition) {
    this.$$set({ outTransition });
    flush();
  }
  get transitionOptions() {
    return this.$$.ctx[25];
  }
  set transitionOptions(transitionOptions) {
    this.$$set({ transitionOptions });
    flush();
  }
  get inTransitionOptions() {
    return this.$$.ctx[3];
  }
  set inTransitionOptions(inTransitionOptions) {
    this.$$set({ inTransitionOptions });
    flush();
  }
  get outTransitionOptions() {
    return this.$$.ctx[4];
  }
  set outTransitionOptions(outTransitionOptions) {
    this.$$set({ outTransitionOptions });
    flush();
  }
};
var EmptyApplicationShell_default = EmptyApplicationShell;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSApplicationShell.svelte
var file8 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSApplicationShell.svelte";
function add_css8(target) {
  append_styles(target, "svelte-1rf9iv4", '.tjs-app.svelte-1rf9iv4.svelte-1rf9iv4{contain:layout style paint;background:var(--tjs-app-background);margin:var(--tjs-app-margin);padding:var(--tjs-app-padding);color:var(--tjs-app-color);font-size:var(--tjs-app-font-size, var(--font-size-14));font-family:var(--tjs-app-font-family, var(--font-sans)), "Signika", "Palatino Linotype", sans-serif;font-weight:var(--tjs-app-font-weight, inherit);max-width:var(--tjs-app-max-width, unset);max-height:var(--tjs-app-max-height, unset);min-width:var(--tjs-app-min-width, unset);min-height:var(--tjs-app-min-height, unset);overflow:var(--tjs-app-overflow, hidden);scrollbar-width:var(--tjs-app-scrollbar-width, thin);scrollbar-color:var(--tjs-app-scrollbar-color, var(--color-scrollbar) var(--color-scrollbar-track))}.tjs-app.mounted.svelte-1rf9iv4.svelte-1rf9iv4{container:tjs-app-window / inline-size}.tjs-app.svelte-1rf9iv4 .window-content.svelte-1rf9iv4{background:var(--tjs-app-content-background, none);color:var(--tjs-app-content-color, inherit);overflow:var(--tjs-app-content-overflow, hidden);padding:var(--tjs-app-content-padding, 1rem);flex:var(--tjs-app-content-flex, 1);display:var(--tjs-app-content-display, flex);flex-direction:var(--tjs-app-content-flex-direction, column);flex-wrap:var(--tjs-app-content-flex-wrap, nowrap)}.tjs-app.mounted.svelte-1rf9iv4 .window-content.svelte-1rf9iv4{container:tjs-app-window-content / inline-size}.tjs-app.svelte-1rf9iv4.svelte-1rf9iv4:focus-visible{outline:var(--tjs-app-content-outline-focus-visible, var(--tjs-default-a11y-outline-focus-visible, 2px solid transparent))}.tjs-app.svelte-1rf9iv4 .window-content.svelte-1rf9iv4:focus-visible{outline:var(--tjs-app-content-outline-focus-visible, var(--tjs-default-a11y-outline-focus-visible, 2px solid transparent))}.tjs-window-app.svelte-1rf9iv4.svelte-1rf9iv4{--header-height:36px;overflow:var(--tjs-app-overflow, hidden);display:var(--tjs-app-display, flex);flex-direction:var(--tjs-app-flex-direction, column);flex-wrap:var(--tjs-app-flex-wrap, nowrap);justify-content:var(--tjs-app-justify-content, flex-start);position:var(--tjs-app-position, absolute);border-radius:var(--tjs-app-border-radius, 6px);border:var(--tjs-app-border, 1px solid var(--color-cool-4));box-shadow:var(--tjs-app-box-shadow, 0 0 10px #000);padding:var(--tjs-app-padding, 0)}.tjs-window-app.svelte-1rf9iv4 .window-header{--button-size:24px}.tjs-window-app.svelte-1rf9iv4 .window-header .window-title{flex:1;margin:0;line-height:var(--header-height);border:none;overflow:hidden;text-align:left;white-space:nowrap;text-overflow:ellipsis;color:var(--tjs-app-header-color, var(--color-light-1))}.tjs-window-app.svelte-1rf9iv4 .window-header button.header-control{--button-background-color:none;padding:0;margin:0;border:none}.tjs-app.svelte-1rf9iv4.svelte-1rf9iv4:not(.themed){--tjs-app-color:var(--color-light-2)}.tjs-app.svelte-1rf9iv4.svelte-1rf9iv4:is(.themed){--tjs-app-color:var(--color-text-primary)}.tjs-app.svelte-1rf9iv4.svelte-1rf9iv4:is(.themed.theme-dark){--color-header-background:rgba(0, 0, 0, 0.5)}.tjs-app.svelte-1rf9iv4.svelte-1rf9iv4:is(.themed.theme-light){--color-header-background:var(--color-dark-3)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVEpTQXBwbGljYXRpb25TaGVsbC5zdmVsdGUiLCJtYXBwaW5ncyI6IkFBb2VHLHVDQUNHLDBCQUEyQixDQUUzQixvQ0FBcUMsQ0FDckMsNEJBQTZCLENBQzdCLDhCQUErQixDQUMvQiwwQkFBMkIsQ0FDM0IsdURBQXdELENBQ3hELG9HQUFxRyxDQUNyRywrQ0FBZ0QsQ0FFaEQseUNBQTBDLENBQzFDLDJDQUE0QyxDQUU1Qyx5Q0FBMEMsQ0FDMUMsMkNBQTRDLENBRTVDLHdDQUF5QyxDQUV6QyxvREFBcUQsQ0FDckQsbUdBQ0gsQ0FHQSwrQ0FDRyxzQ0FDSCxDQUVBLHVEQUNHLGtEQUFtRCxDQUNuRCwyQ0FBNEMsQ0FDNUMsZ0RBQWlELENBQ2pELDRDQUE2QyxDQUU3QyxtQ0FBb0MsQ0FDcEMsNENBQTZDLENBQzdDLDREQUE2RCxDQUM3RCxrREFDSCxDQUdBLCtEQUNHLDhDQUNILENBRUEscURBQ0csMEhBQ0gsQ0FFQSxxRUFDRywwSEFDSCxDQUVBLDhDQUNHLG9CQUFxQixDQUdyQix3Q0FBeUMsQ0FFekMsb0NBQXFDLENBQ3JDLG9EQUFxRCxDQUNyRCwwQ0FBMkMsQ0FDM0MsMERBQTJELENBQzNELDBDQUEyQyxDQUMzQywrQ0FBZ0QsQ0FDaEQsMkRBQTRELENBQzVELG1EQUFvRCxDQUNwRCxpQ0FDSCxDQUVBLDhDQUNHLGtCQUNILENBRUEsNERBQ0csTUFBTyxDQUNQLFFBQVMsQ0FFVCxnQ0FBaUMsQ0FDakMsV0FBWSxDQUNaLGVBQWdCLENBQ2hCLGVBQWdCLENBQ2hCLGtCQUFtQixDQUNuQixzQkFBdUIsQ0FDdkIsdURBQ0gsQ0FFQSxvRUFDRyw4QkFBK0IsQ0FDL0IsU0FBVSxDQUNWLFFBQVMsQ0FDVCxXQUNILENBVUEsb0RBRUcsb0NBQ0gsQ0FHQSxtREFDRyx5Q0FDSCxDQUVBLDhEQUNHLDRDQUNILENBRUEsK0RBQ0csNkNBQ0giLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlRKU0FwcGxpY2F0aW9uU2hlbGwuc3ZlbHRlIl19 */');
}
function create_else_block4(ctx) {
  let div;
  let tjsapplicationheader;
  let t0;
  let section;
  let applyStyles_action;
  let contentResizeObserver_action;
  let t1;
  let resizablehandle;
  let t2;
  let tjsfocuswrap;
  let div_id_value;
  let div_class_value;
  let div_data_appid_value;
  let applyStyles_action_1;
  let dynamicAction_action;
  let current;
  let mounted;
  let dispose;
  tjsapplicationheader = new TJSApplicationHeader_default({
    props: {
      draggable: (
        /*draggable*/
        ctx[6]
      ),
      draggableOptions: (
        /*draggableOptions*/
        ctx[7]
      )
    },
    $$inline: true
  });
  const default_slot_template = (
    /*#slots*/
    ctx[41].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[40],
    null
  );
  resizablehandle = new ResizableHandle_default({ $$inline: true });
  tjsfocuswrap = new TJSFocusWrap_default({
    props: {
      elementRoot: (
        /*elementRoot*/
        ctx[1]
      ),
      enabled: (
        /*focusWrapEnabled*/
        ctx[11]
      )
    },
    $$inline: true
  });
  const block = {
    c: function create() {
      div = element("div");
      create_component(tjsapplicationheader.$$.fragment);
      t0 = space();
      section = element("section");
      if (default_slot) default_slot.c();
      t1 = space();
      create_component(resizablehandle.$$.fragment);
      t2 = space();
      create_component(tjsfocuswrap.$$.fragment);
      attr_dev(section, "class", "window-content svelte-1rf9iv4");
      attr_dev(section, "tabindex", "-1");
      add_location(section, file8, 463, 8, 19888);
      attr_dev(div, "id", div_id_value = /*application*/
      ctx[10].id);
      attr_dev(div, "class", div_class_value = "tjs-app tjs-window-app " + /*appClasses*/
      ctx[12] + " svelte-1rf9iv4");
      attr_dev(div, "data-appid", div_data_appid_value = /*application*/
      ctx[10].appId);
      attr_dev(div, "role", "application");
      attr_dev(div, "tabindex", "-1");
      toggle_class(
        div,
        "mounted",
        /*mounted*/
        ctx[13]
      );
      add_location(div, file8, 450, 4, 19334);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      mount_component(tjsapplicationheader, div, null);
      append_dev(div, t0);
      append_dev(div, section);
      if (default_slot) {
        default_slot.m(section, null);
      }
      ctx[44](section);
      append_dev(div, t1);
      mount_component(resizablehandle, div, null);
      append_dev(div, t2);
      mount_component(tjsfocuswrap, div, null);
      ctx[45](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(
            section,
            "pointerdown",
            /*onPointerdownContent*/
            ctx[25],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            section,
            /*stylesContent*/
            ctx[9]
          )),
          action_destroyer(contentResizeObserver_action = /*contentResizeObserver*/
          ctx[20].call(
            null,
            section,
            /*resizeObservedContent*/
            ctx[26]
          )),
          listen_dev(div, "close:popup", stop_propagation(prevent_default(
            /*onClosePopup*/
            ctx[22]
          )), false, true, true, false),
          listen_dev(
            div,
            "keydown",
            /*onKeydown*/
            ctx[23],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownApp*/
            ctx[24],
            true,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action_1 = applyStyles.call(
            null,
            div,
            /*stylesApp*/
            ctx[8]
          )),
          action_destroyer(dynamicAction_action = dynamicAction.call(
            null,
            div,
            /*appResizeObserver*/
            ctx[14]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, dirty) {
      const tjsapplicationheader_changes = {};
      if (dirty[0] & /*draggable*/
      64) tjsapplicationheader_changes.draggable = /*draggable*/
      ctx2[6];
      if (dirty[0] & /*draggableOptions*/
      128) tjsapplicationheader_changes.draggableOptions = /*draggableOptions*/
      ctx2[7];
      tjsapplicationheader.$set(tjsapplicationheader_changes);
      if (default_slot) {
        if (default_slot.p && (!current || dirty[1] & /*$$scope*/
        512)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx2,
            /*$$scope*/
            ctx2[40],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx2[40]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx2[40],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*stylesContent*/
      512) applyStyles_action.update.call(
        null,
        /*stylesContent*/
        ctx2[9]
      );
      const tjsfocuswrap_changes = {};
      if (dirty[0] & /*elementRoot*/
      2) tjsfocuswrap_changes.elementRoot = /*elementRoot*/
      ctx2[1];
      if (dirty[0] & /*focusWrapEnabled*/
      2048) tjsfocuswrap_changes.enabled = /*focusWrapEnabled*/
      ctx2[11];
      tjsfocuswrap.$set(tjsfocuswrap_changes);
      if (!current || dirty[0] & /*application*/
      1024 && div_id_value !== (div_id_value = /*application*/
      ctx2[10].id)) {
        attr_dev(div, "id", div_id_value);
      }
      if (!current || dirty[0] & /*appClasses*/
      4096 && div_class_value !== (div_class_value = "tjs-app tjs-window-app " + /*appClasses*/
      ctx2[12] + " svelte-1rf9iv4")) {
        attr_dev(div, "class", div_class_value);
      }
      if (!current || dirty[0] & /*application*/
      1024 && div_data_appid_value !== (div_data_appid_value = /*application*/
      ctx2[10].appId)) {
        attr_dev(div, "data-appid", div_data_appid_value);
      }
      if (applyStyles_action_1 && is_function(applyStyles_action_1.update) && dirty[0] & /*stylesApp*/
      256) applyStyles_action_1.update.call(
        null,
        /*stylesApp*/
        ctx2[8]
      );
      if (dynamicAction_action && is_function(dynamicAction_action.update) && dirty[0] & /*appResizeObserver*/
      16384) dynamicAction_action.update.call(
        null,
        /*appResizeObserver*/
        ctx2[14]
      );
      if (!current || dirty[0] & /*appClasses, mounted*/
      12288) {
        toggle_class(
          div,
          "mounted",
          /*mounted*/
          ctx2[13]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(tjsapplicationheader.$$.fragment, local);
      transition_in(default_slot, local);
      transition_in(resizablehandle.$$.fragment, local);
      transition_in(tjsfocuswrap.$$.fragment, local);
      current = true;
    },
    o: function outro(local) {
      transition_out(tjsapplicationheader.$$.fragment, local);
      transition_out(default_slot, local);
      transition_out(resizablehandle.$$.fragment, local);
      transition_out(tjsfocuswrap.$$.fragment, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      destroy_component(tjsapplicationheader);
      if (default_slot) default_slot.d(detaching);
      ctx[44](null);
      destroy_component(resizablehandle);
      destroy_component(tjsfocuswrap);
      ctx[45](null);
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_else_block4.name,
    type: "else",
    source: "(449:0) {:else}",
    ctx
  });
  return block;
}
function create_if_block6(ctx) {
  let div;
  let tjsapplicationheader;
  let t0;
  let section;
  let applyStyles_action;
  let contentResizeObserver_action;
  let t1;
  let resizablehandle;
  let t2;
  let tjsfocuswrap;
  let div_id_value;
  let div_class_value;
  let div_data_appid_value;
  let applyStyles_action_1;
  let dynamicAction_action;
  let div_intro;
  let div_outro;
  let current;
  let mounted;
  let dispose;
  tjsapplicationheader = new TJSApplicationHeader_default({
    props: {
      draggable: (
        /*draggable*/
        ctx[6]
      ),
      draggableOptions: (
        /*draggableOptions*/
        ctx[7]
      )
    },
    $$inline: true
  });
  const default_slot_template = (
    /*#slots*/
    ctx[41].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[40],
    null
  );
  resizablehandle = new ResizableHandle_default({ $$inline: true });
  tjsfocuswrap = new TJSFocusWrap_default({
    props: { elementRoot: (
      /*elementRoot*/
      ctx[1]
    ) },
    $$inline: true
  });
  const block = {
    c: function create() {
      div = element("div");
      create_component(tjsapplicationheader.$$.fragment);
      t0 = space();
      section = element("section");
      if (default_slot) default_slot.c();
      t1 = space();
      create_component(resizablehandle.$$.fragment);
      t2 = space();
      create_component(tjsfocuswrap.$$.fragment);
      attr_dev(section, "class", "window-content svelte-1rf9iv4");
      attr_dev(section, "tabindex", "-1");
      add_location(section, file8, 437, 8, 18845);
      attr_dev(div, "id", div_id_value = /*application*/
      ctx[10].id);
      attr_dev(div, "class", div_class_value = "tjs-app tjs-window-app " + /*appClasses*/
      ctx[12] + " svelte-1rf9iv4");
      attr_dev(div, "data-appid", div_data_appid_value = /*application*/
      ctx[10].appId);
      attr_dev(div, "role", "application");
      attr_dev(div, "tabindex", "-1");
      toggle_class(
        div,
        "mounted",
        /*mounted*/
        ctx[13]
      );
      add_location(div, file8, 422, 4, 18178);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      mount_component(tjsapplicationheader, div, null);
      append_dev(div, t0);
      append_dev(div, section);
      if (default_slot) {
        default_slot.m(section, null);
      }
      ctx[42](section);
      append_dev(div, t1);
      mount_component(resizablehandle, div, null);
      append_dev(div, t2);
      mount_component(tjsfocuswrap, div, null);
      ctx[43](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(
            section,
            "pointerdown",
            /*onPointerdownContent*/
            ctx[25],
            false,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action = applyStyles.call(
            null,
            section,
            /*stylesContent*/
            ctx[9]
          )),
          action_destroyer(contentResizeObserver_action = /*contentResizeObserver*/
          ctx[20].call(
            null,
            section,
            /*resizeObservedContent*/
            ctx[26]
          )),
          listen_dev(div, "close:popup", stop_propagation(prevent_default(
            /*onClosePopup*/
            ctx[22]
          )), false, true, true, false),
          listen_dev(
            div,
            "keydown",
            /*onKeydown*/
            ctx[23],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "pointerdown",
            /*onPointerdownApp*/
            ctx[24],
            true,
            false,
            false,
            false
          ),
          action_destroyer(applyStyles_action_1 = applyStyles.call(
            null,
            div,
            /*stylesApp*/
            ctx[8]
          )),
          action_destroyer(dynamicAction_action = dynamicAction.call(
            null,
            div,
            /*appResizeObserver*/
            ctx[14]
          ))
        ];
        mounted = true;
      }
    },
    p: function update(new_ctx, dirty) {
      ctx = new_ctx;
      const tjsapplicationheader_changes = {};
      if (dirty[0] & /*draggable*/
      64) tjsapplicationheader_changes.draggable = /*draggable*/
      ctx[6];
      if (dirty[0] & /*draggableOptions*/
      128) tjsapplicationheader_changes.draggableOptions = /*draggableOptions*/
      ctx[7];
      tjsapplicationheader.$set(tjsapplicationheader_changes);
      if (default_slot) {
        if (default_slot.p && (!current || dirty[1] & /*$$scope*/
        512)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx,
            /*$$scope*/
            ctx[40],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx[40]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx[40],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty[0] & /*stylesContent*/
      512) applyStyles_action.update.call(
        null,
        /*stylesContent*/
        ctx[9]
      );
      const tjsfocuswrap_changes = {};
      if (dirty[0] & /*elementRoot*/
      2) tjsfocuswrap_changes.elementRoot = /*elementRoot*/
      ctx[1];
      tjsfocuswrap.$set(tjsfocuswrap_changes);
      if (!current || dirty[0] & /*application*/
      1024 && div_id_value !== (div_id_value = /*application*/
      ctx[10].id)) {
        attr_dev(div, "id", div_id_value);
      }
      if (!current || dirty[0] & /*appClasses*/
      4096 && div_class_value !== (div_class_value = "tjs-app tjs-window-app " + /*appClasses*/
      ctx[12] + " svelte-1rf9iv4")) {
        attr_dev(div, "class", div_class_value);
      }
      if (!current || dirty[0] & /*application*/
      1024 && div_data_appid_value !== (div_data_appid_value = /*application*/
      ctx[10].appId)) {
        attr_dev(div, "data-appid", div_data_appid_value);
      }
      if (applyStyles_action_1 && is_function(applyStyles_action_1.update) && dirty[0] & /*stylesApp*/
      256) applyStyles_action_1.update.call(
        null,
        /*stylesApp*/
        ctx[8]
      );
      if (dynamicAction_action && is_function(dynamicAction_action.update) && dirty[0] & /*appResizeObserver*/
      16384) dynamicAction_action.update.call(
        null,
        /*appResizeObserver*/
        ctx[14]
      );
      if (!current || dirty[0] & /*appClasses, mounted*/
      12288) {
        toggle_class(
          div,
          "mounted",
          /*mounted*/
          ctx[13]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(tjsapplicationheader.$$.fragment, local);
      transition_in(default_slot, local);
      transition_in(resizablehandle.$$.fragment, local);
      transition_in(tjsfocuswrap.$$.fragment, local);
      add_render_callback(() => {
        if (!current) return;
        if (div_outro) div_outro.end(1);
        div_intro = create_in_transition(
          div,
          /*inTransition*/
          ctx[2],
          /*inTransitionOptions*/
          ctx[4]
        );
        div_intro.start();
      });
      current = true;
    },
    o: function outro(local) {
      transition_out(tjsapplicationheader.$$.fragment, local);
      transition_out(default_slot, local);
      transition_out(resizablehandle.$$.fragment, local);
      transition_out(tjsfocuswrap.$$.fragment, local);
      if (div_intro) div_intro.invalidate();
      div_outro = create_out_transition(
        div,
        /*outTransition*/
        ctx[3],
        /*outTransitionOptions*/
        ctx[5]
      );
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      destroy_component(tjsapplicationheader);
      if (default_slot) default_slot.d(detaching);
      ctx[42](null);
      destroy_component(resizablehandle);
      destroy_component(tjsfocuswrap);
      ctx[43](null);
      if (detaching && div_outro) div_outro.end();
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block6.name,
    type: "if",
    source: "(421:0) {#if inTransition !== TJSDefaultTransition.default || outTransition !== TJSDefaultTransition.default}",
    ctx
  });
  return block;
}
function create_fragment9(ctx) {
  let current_block_type_index;
  let if_block;
  let if_block_anchor;
  let current;
  const if_block_creators = [create_if_block6, create_else_block4];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*inTransition*/
      ctx2[2] !== TJSDefaultTransition.default || /*outTransition*/
      ctx2[3] !== TJSDefaultTransition.default
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx, [-1, -1]);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  const block = {
    c: function create() {
      if_block.c();
      if_block_anchor = empty();
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      if_blocks[current_block_type_index].m(target, anchor);
      insert_dev(target, if_block_anchor, anchor);
      current = true;
    },
    p: function update(ctx2, dirty) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2, dirty);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(if_block_anchor.parentNode, if_block_anchor);
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o: function outro(local) {
      transition_out(if_block);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(if_block_anchor);
      }
      if_blocks[current_block_type_index].d(detaching);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment9.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance9($$self, $$props, $$invalidate) {
  let appResizeObserver;
  let $focusKeep;
  let $focusAuto;
  let $themeStore;
  let $minimized;
  let $focusTrap;
  let $resizeObservable;
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("TJSApplicationShell", slots, ["default"]);
  let { elementContent = void 0 } = $$props;
  let { elementRoot = void 0 } = $$props;
  let { draggable: draggable2 = void 0 } = $$props;
  let { draggableOptions = void 0 } = $$props;
  let { stylesApp = void 0 } = $$props;
  let { stylesContent = void 0 } = $$props;
  const application = getContext("#external")?.application;
  const { focusAuto, focusKeep, focusTrap } = application.reactive.storeAppOptions;
  validate_store(focusAuto, "focusAuto");
  component_subscribe($$self, focusAuto, (value) => $$invalidate(35, $focusAuto = value));
  validate_store(focusKeep, "focusKeep");
  component_subscribe($$self, focusKeep, (value) => $$invalidate(46, $focusKeep = value));
  validate_store(focusTrap, "focusTrap");
  component_subscribe($$self, focusTrap, (value) => $$invalidate(38, $focusTrap = value));
  const { minimized } = application.reactive.storeUIState;
  validate_store(minimized, "minimized");
  component_subscribe($$self, minimized, (value) => $$invalidate(37, $minimized = value));
  const { resizeObservable } = application.position.stores;
  validate_store(resizeObservable, "resizeObservable");
  component_subscribe($$self, resizeObservable, (value) => $$invalidate(39, $resizeObservable = value));
  let { appOffsetHeight = false } = $$props;
  let { appOffsetWidth = false } = $$props;
  const initialAppResizeObserver = !!appOffsetHeight || !!appOffsetWidth;
  let { contentOffsetHeight = false } = $$props;
  let { contentOffsetWidth = false } = $$props;
  const contentResizeObserver = !!contentOffsetHeight || !!contentOffsetWidth ? resizeObserver : () => null;
  const internal = new AppShellContextInternal();
  const s_IGNORE_CLASSES = { ignoreClasses: ["tjs-focus-wrap"] };
  setContext("#internal", internal);
  let focusWrapEnabled;
  let { transition = TJSDefaultTransition.default } = $$props;
  let { inTransition = TJSDefaultTransition.default } = $$props;
  let { outTransition = TJSDefaultTransition.default } = $$props;
  let { transitionOptions = void 0 } = $$props;
  let { inTransitionOptions = TJSDefaultTransition.options } = $$props;
  let { outTransitionOptions = TJSDefaultTransition.options } = $$props;
  let oldTransition = TJSDefaultTransition.default;
  let oldTransitionOptions = void 0;
  const themeStore = ThemeObserver.stores.theme;
  validate_store(themeStore, "themeStore");
  component_subscribe($$self, themeStore, (value) => $$invalidate(36, $themeStore = value));
  let appClasses = "";
  let mounted = false;
  onMount(() => {
    if ($focusAuto) {
      elementRoot.focus();
    }
    requestAnimationFrame(() => $$invalidate(13, mounted = true));
  });
  function onClosePopup(event) {
    if (!$focusAuto) {
      return;
    }
    const targetEl = event?.detail?.target;
    if (!A11yHelper.isFocusTarget(targetEl)) {
      return;
    }
    if (A11yHelper.isFocusable(targetEl)) {
      return;
    }
    const elementRootContains = elementRoot.contains(targetEl);
    if (targetEl === elementRoot) {
      elementRoot.focus();
    } else if (targetEl === elementContent) {
      elementContent.focus();
    } else if (elementRootContains) {
      if (elementContent.contains(targetEl)) {
        elementContent.focus();
      } else {
        elementRoot.focus();
      }
    }
  }
  function onKeydown(event) {
    const FVTTKeyboardManager = foundry.helpers.interaction.KeyboardManager;
    if ((event.target === elementRoot || event.target === elementContent) && FVTTKeyboardManager && FVTTKeyboardManager?._getMatchingActions?.(FVTTKeyboardManager?.getKeyboardEventContext?.(event))?.length) {
      event.target?.blur();
      return;
    }
    if (focusWrapEnabled && event.shiftKey && event.code === "Tab") {
      const allFocusable = A11yHelper.getFocusableElements(elementRoot, s_IGNORE_CLASSES);
      const firstFocusEl = allFocusable.length > 0 ? allFocusable[0] : void 0;
      const lastFocusEl = allFocusable.length > 0 ? allFocusable[allFocusable.length - 1] : void 0;
      const activeWindow = application.reactive.activeWindow;
      if (elementRoot === activeWindow.document.activeElement || firstFocusEl === activeWindow.document.activeElement) {
        if (A11yHelper.isFocusTarget(lastFocusEl) && firstFocusEl !== lastFocusEl) {
          lastFocusEl.focus();
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
    application.bringToTop.call(application);
  }
  function onPointerdownApp() {
    application.bringToTop.call(application);
  }
  function onPointerdownContent(event) {
    const focusable = A11yHelper.isFocusable(event.target);
    if (!focusable && $focusAuto) {
      if ($focusKeep) {
        const activeWindow = application.reactive.activeWindow;
        const focusOutside = !elementRoot.contains(activeWindow.document.activeElement);
        if (focusOutside) {
          elementContent.focus();
        } else {
          event.preventDefault();
        }
      } else {
        elementContent.focus();
      }
    }
  }
  function resizeObservedContent(offsetWidth, offsetHeight) {
    $$invalidate(30, contentOffsetWidth = offsetWidth);
    $$invalidate(29, contentOffsetHeight = offsetHeight);
  }
  function resizeObservedApp(offsetWidth, offsetHeight, contentWidth, contentHeight) {
    application.position.stores.resizeObserved.update((object) => {
      object.contentWidth = contentWidth;
      object.contentHeight = contentHeight;
      object.offsetWidth = offsetWidth;
      object.offsetHeight = offsetHeight;
      return object;
    });
    $$invalidate(27, appOffsetHeight = offsetHeight);
    $$invalidate(28, appOffsetWidth = offsetWidth);
  }
  const writable_props = [
    "elementContent",
    "elementRoot",
    "draggable",
    "draggableOptions",
    "stylesApp",
    "stylesContent",
    "appOffsetHeight",
    "appOffsetWidth",
    "contentOffsetHeight",
    "contentOffsetWidth",
    "transition",
    "inTransition",
    "outTransition",
    "transitionOptions",
    "inTransitionOptions",
    "outTransitionOptions"
  ];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<TJSApplicationShell> was created with unknown prop '${key}'`);
  });
  function section_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementContent = $$value;
      $$invalidate(0, elementContent);
    });
  }
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementRoot = $$value;
      $$invalidate(1, elementRoot);
    });
  }
  function section_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementContent = $$value;
      $$invalidate(0, elementContent);
    });
  }
  function div_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      elementRoot = $$value;
      $$invalidate(1, elementRoot);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(0, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(1, elementRoot = $$props2.elementRoot);
    if ("draggable" in $$props2) $$invalidate(6, draggable2 = $$props2.draggable);
    if ("draggableOptions" in $$props2) $$invalidate(7, draggableOptions = $$props2.draggableOptions);
    if ("stylesApp" in $$props2) $$invalidate(8, stylesApp = $$props2.stylesApp);
    if ("stylesContent" in $$props2) $$invalidate(9, stylesContent = $$props2.stylesContent);
    if ("appOffsetHeight" in $$props2) $$invalidate(27, appOffsetHeight = $$props2.appOffsetHeight);
    if ("appOffsetWidth" in $$props2) $$invalidate(28, appOffsetWidth = $$props2.appOffsetWidth);
    if ("contentOffsetHeight" in $$props2) $$invalidate(29, contentOffsetHeight = $$props2.contentOffsetHeight);
    if ("contentOffsetWidth" in $$props2) $$invalidate(30, contentOffsetWidth = $$props2.contentOffsetWidth);
    if ("transition" in $$props2) $$invalidate(31, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(2, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(3, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(32, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(4, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(5, outTransitionOptions = $$props2.outTransitionOptions);
    if ("$$scope" in $$props2) $$invalidate(40, $$scope = $$props2.$$scope);
  };
  $$self.$capture_state = () => ({
    getContext,
    onMount,
    setContext,
    resizeObserver,
    applyStyles,
    dynamicAction,
    ThemeObserver,
    TJSDefaultTransition,
    A11yHelper,
    isObject,
    AppShellContextInternal,
    TJSApplicationHeader: TJSApplicationHeader_default,
    ResizableHandle: ResizableHandle_default,
    TJSFocusWrap: TJSFocusWrap_default,
    elementContent,
    elementRoot,
    draggable: draggable2,
    draggableOptions,
    stylesApp,
    stylesContent,
    application,
    focusAuto,
    focusKeep,
    focusTrap,
    minimized,
    resizeObservable,
    appOffsetHeight,
    appOffsetWidth,
    initialAppResizeObserver,
    contentOffsetHeight,
    contentOffsetWidth,
    contentResizeObserver,
    internal,
    s_IGNORE_CLASSES,
    focusWrapEnabled,
    transition,
    inTransition,
    outTransition,
    transitionOptions,
    inTransitionOptions,
    outTransitionOptions,
    oldTransition,
    oldTransitionOptions,
    themeStore,
    appClasses,
    mounted,
    onClosePopup,
    onKeydown,
    onPointerdownApp,
    onPointerdownContent,
    resizeObservedContent,
    resizeObservedApp,
    appResizeObserver,
    $focusKeep,
    $focusAuto,
    $themeStore,
    $minimized,
    $focusTrap,
    $resizeObservable
  });
  $$self.$inject_state = ($$props2) => {
    if ("elementContent" in $$props2) $$invalidate(0, elementContent = $$props2.elementContent);
    if ("elementRoot" in $$props2) $$invalidate(1, elementRoot = $$props2.elementRoot);
    if ("draggable" in $$props2) $$invalidate(6, draggable2 = $$props2.draggable);
    if ("draggableOptions" in $$props2) $$invalidate(7, draggableOptions = $$props2.draggableOptions);
    if ("stylesApp" in $$props2) $$invalidate(8, stylesApp = $$props2.stylesApp);
    if ("stylesContent" in $$props2) $$invalidate(9, stylesContent = $$props2.stylesContent);
    if ("appOffsetHeight" in $$props2) $$invalidate(27, appOffsetHeight = $$props2.appOffsetHeight);
    if ("appOffsetWidth" in $$props2) $$invalidate(28, appOffsetWidth = $$props2.appOffsetWidth);
    if ("contentOffsetHeight" in $$props2) $$invalidate(29, contentOffsetHeight = $$props2.contentOffsetHeight);
    if ("contentOffsetWidth" in $$props2) $$invalidate(30, contentOffsetWidth = $$props2.contentOffsetWidth);
    if ("focusWrapEnabled" in $$props2) $$invalidate(11, focusWrapEnabled = $$props2.focusWrapEnabled);
    if ("transition" in $$props2) $$invalidate(31, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(2, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(3, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(32, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(4, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(5, outTransitionOptions = $$props2.outTransitionOptions);
    if ("oldTransition" in $$props2) $$invalidate(33, oldTransition = $$props2.oldTransition);
    if ("oldTransitionOptions" in $$props2) $$invalidate(34, oldTransitionOptions = $$props2.oldTransitionOptions);
    if ("appClasses" in $$props2) $$invalidate(12, appClasses = $$props2.appClasses);
    if ("mounted" in $$props2) $$invalidate(13, mounted = $$props2.mounted);
    if ("appResizeObserver" in $$props2) $$invalidate(14, appResizeObserver = $$props2.appResizeObserver);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty[1] & /*$resizeObservable*/
    256) {
      $: $$invalidate(14, appResizeObserver = initialAppResizeObserver || $resizeObservable ? {
        action: resizeObserver,
        data: resizeObservedApp
      } : void 0);
    }
    if ($$self.$$.dirty[0] & /*elementContent*/
    1) {
      $: if (elementContent !== void 0 && elementContent !== null) {
        getContext("#internal").stores.elementContent.set(elementContent);
      }
    }
    if ($$self.$$.dirty[0] & /*elementRoot*/
    2) {
      $: if (elementRoot !== void 0 && elementRoot !== null) {
        getContext("#internal").stores.elementRoot.set(elementRoot);
      }
    }
    if ($$self.$$.dirty[1] & /*$focusAuto, $focusTrap, $minimized*/
    208) {
      $: $$invalidate(11, focusWrapEnabled = $focusAuto && $focusTrap && !$minimized);
    }
    if ($$self.$$.dirty[1] & /*oldTransition, transition*/
    5) {
      $: if (oldTransition !== transition) {
        const newTransition = typeof transition === "function" ? transition : TJSDefaultTransition.default;
        $$invalidate(2, inTransition = newTransition);
        $$invalidate(3, outTransition = newTransition);
        $$invalidate(33, oldTransition = newTransition);
      }
    }
    if ($$self.$$.dirty[1] & /*oldTransitionOptions, transitionOptions*/
    10) {
      $: if (oldTransitionOptions !== transitionOptions) {
        const newOptions = transitionOptions !== TJSDefaultTransition.options && isObject(transitionOptions) ? transitionOptions : TJSDefaultTransition.options;
        $$invalidate(4, inTransitionOptions = newOptions);
        $$invalidate(5, outTransitionOptions = newOptions);
        $$invalidate(34, oldTransitionOptions = newOptions);
      }
    }
    if ($$self.$$.dirty[0] & /*inTransition*/
    4) {
      $: if (typeof inTransition !== "function") {
        $$invalidate(2, inTransition = TJSDefaultTransition.default);
      }
    }
    if ($$self.$$.dirty[0] & /*outTransition, application*/
    1032) {
      $: {
        if (typeof outTransition !== "function") {
          $$invalidate(3, outTransition = TJSDefaultTransition.default);
        }
        const defaultCloseAnimation = application?.options?.defaultCloseAnimation;
        if (typeof defaultCloseAnimation === "boolean" && defaultCloseAnimation && outTransition !== TJSDefaultTransition.default) {
          $$invalidate(10, application.options.defaultCloseAnimation = false, application);
        }
      }
    }
    if ($$self.$$.dirty[0] & /*inTransitionOptions*/
    16) {
      $: if (!isObject(inTransitionOptions)) {
        $$invalidate(4, inTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty[0] & /*outTransitionOptions*/
    32) {
      $: if (!isObject(outTransitionOptions)) {
        $$invalidate(5, outTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty[0] & /*application*/
    1024 | $$self.$$.dirty[1] & /*$themeStore*/
    32) {
      $: if ($themeStore) {
        $$invalidate(12, appClasses = ThemeObserver.appClasses(application, { hasThemed: true }));
      }
    }
  };
  return [
    elementContent,
    elementRoot,
    inTransition,
    outTransition,
    inTransitionOptions,
    outTransitionOptions,
    draggable2,
    draggableOptions,
    stylesApp,
    stylesContent,
    application,
    focusWrapEnabled,
    appClasses,
    mounted,
    appResizeObserver,
    focusAuto,
    focusKeep,
    focusTrap,
    minimized,
    resizeObservable,
    contentResizeObserver,
    themeStore,
    onClosePopup,
    onKeydown,
    onPointerdownApp,
    onPointerdownContent,
    resizeObservedContent,
    appOffsetHeight,
    appOffsetWidth,
    contentOffsetHeight,
    contentOffsetWidth,
    transition,
    transitionOptions,
    oldTransition,
    oldTransitionOptions,
    $focusAuto,
    $themeStore,
    $minimized,
    $focusTrap,
    $resizeObservable,
    $$scope,
    slots,
    section_binding,
    div_binding,
    section_binding_1,
    div_binding_1
  ];
}
var TJSApplicationShell = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(
      this,
      options,
      instance9,
      create_fragment9,
      safe_not_equal,
      {
        elementContent: 0,
        elementRoot: 1,
        draggable: 6,
        draggableOptions: 7,
        stylesApp: 8,
        stylesContent: 9,
        appOffsetHeight: 27,
        appOffsetWidth: 28,
        contentOffsetHeight: 29,
        contentOffsetWidth: 30,
        transition: 31,
        inTransition: 2,
        outTransition: 3,
        transitionOptions: 32,
        inTransitionOptions: 4,
        outTransitionOptions: 5
      },
      add_css8,
      [-1, -1]
    );
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "TJSApplicationShell",
      options,
      id: create_fragment9.name
    });
  }
  get elementContent() {
    return this.$$.ctx[0];
  }
  set elementContent(elementContent) {
    this.$$set({ elementContent });
    flush();
  }
  get elementRoot() {
    return this.$$.ctx[1];
  }
  set elementRoot(elementRoot) {
    this.$$set({ elementRoot });
    flush();
  }
  get draggable() {
    return this.$$.ctx[6];
  }
  set draggable(draggable2) {
    this.$$set({ draggable: draggable2 });
    flush();
  }
  get draggableOptions() {
    return this.$$.ctx[7];
  }
  set draggableOptions(draggableOptions) {
    this.$$set({ draggableOptions });
    flush();
  }
  get stylesApp() {
    return this.$$.ctx[8];
  }
  set stylesApp(stylesApp) {
    this.$$set({ stylesApp });
    flush();
  }
  get stylesContent() {
    return this.$$.ctx[9];
  }
  set stylesContent(stylesContent) {
    this.$$set({ stylesContent });
    flush();
  }
  get appOffsetHeight() {
    return this.$$.ctx[27];
  }
  set appOffsetHeight(appOffsetHeight) {
    this.$$set({ appOffsetHeight });
    flush();
  }
  get appOffsetWidth() {
    return this.$$.ctx[28];
  }
  set appOffsetWidth(appOffsetWidth) {
    this.$$set({ appOffsetWidth });
    flush();
  }
  get contentOffsetHeight() {
    return this.$$.ctx[29];
  }
  set contentOffsetHeight(contentOffsetHeight) {
    this.$$set({ contentOffsetHeight });
    flush();
  }
  get contentOffsetWidth() {
    return this.$$.ctx[30];
  }
  set contentOffsetWidth(contentOffsetWidth) {
    this.$$set({ contentOffsetWidth });
    flush();
  }
  get transition() {
    return this.$$.ctx[31];
  }
  set transition(transition) {
    this.$$set({ transition });
    flush();
  }
  get inTransition() {
    return this.$$.ctx[2];
  }
  set inTransition(inTransition) {
    this.$$set({ inTransition });
    flush();
  }
  get outTransition() {
    return this.$$.ctx[3];
  }
  set outTransition(outTransition) {
    this.$$set({ outTransition });
    flush();
  }
  get transitionOptions() {
    return this.$$.ctx[32];
  }
  set transitionOptions(transitionOptions) {
    this.$$set({ transitionOptions });
    flush();
  }
  get inTransitionOptions() {
    return this.$$.ctx[4];
  }
  set inTransitionOptions(inTransitionOptions) {
    this.$$set({ inTransitionOptions });
    flush();
  }
  get outTransitionOptions() {
    return this.$$.ctx[5];
  }
  set outTransitionOptions(outTransitionOptions) {
    this.$$set({ outTransitionOptions });
    flush();
  }
};
var TJSApplicationShell_default = TJSApplicationShell;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSGlassPane.svelte
var file9 = "node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/TJSGlassPane.svelte";
function add_css9(target) {
  append_styles(target, "svelte-1yohjby", ".tjs-glass-pane.svelte-1yohjby{border:none;background:transparent}.tjs-glass-pane.svelte-1yohjby,.tjs-glass-pane-background.svelte-1yohjby,.tjs-glass-pane-container.svelte-1yohjby{position:absolute;overflow:hidden;padding:0;height:100%;width:100%;max-height:100%;max-width:100%}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVEpTR2xhc3NQYW5lLnN2ZWx0ZSIsIm1hcHBpbmdzIjoiQUEyTUcsK0JBQ0ksV0FBWSxDQUNaLHNCQUNILENBRUQsa0hBQ0csaUJBQWtCLENBQ2xCLGVBQWdCLENBRWhCLFNBQVUsQ0FDVixXQUFZLENBQ1osVUFBVyxDQUNYLGVBQWdCLENBQ2hCLGNBQ0giLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlRKU0dsYXNzUGFuZS5zdmVsdGUiXX0= */");
}
function create_else_block5(ctx) {
  let div;
  let applyStyles_action;
  let div_intro;
  let div_outro;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[19].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[18],
    null
  );
  const block = {
    c: function create() {
      div = element("div");
      if (default_slot) default_slot.c();
      attr_dev(div, "class", "tjs-glass-pane-background tjs-glass-pane-container svelte-1yohjby");
      set_style(
        div,
        "background",
        /*background*/
        ctx[5]
      );
      add_location(div, file9, 191, 6, 6835);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      if (default_slot) {
        default_slot.m(div, null);
      }
      ctx[25](div);
      current = true;
      if (!mounted) {
        dispose = action_destroyer(applyStyles_action = applyStyles.call(
          null,
          div,
          /*styles*/
          ctx[7]
        ));
        mounted = true;
      }
    },
    p: function update(new_ctx, dirty) {
      ctx = new_ctx;
      if (default_slot) {
        if (default_slot.p && (!current || dirty & /*$$scope*/
        262144)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx,
            /*$$scope*/
            ctx[18],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx[18]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx[18],
              dirty,
              null
            ),
            null
          );
        }
      }
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/
      128) applyStyles_action.update.call(
        null,
        /*styles*/
        ctx[7]
      );
      if (dirty & /*background*/
      32) {
        set_style(
          div,
          "background",
          /*background*/
          ctx[5]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(default_slot, local);
      add_render_callback(() => {
        if (!current) return;
        if (div_outro) div_outro.end(1);
        div_intro = create_in_transition(
          div,
          /*inTransition*/
          ctx[1],
          /*inTransitionOptions*/
          ctx[3]
        );
        div_intro.start();
      });
      current = true;
    },
    o: function outro(local) {
      transition_out(default_slot, local);
      if (div_intro) div_intro.invalidate();
      div_outro = create_out_transition(
        div,
        /*outTransition*/
        ctx[2],
        /*outTransitionOptions*/
        ctx[4]
      );
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      if (default_slot) default_slot.d(detaching);
      ctx[25](null);
      if (detaching && div_outro) div_outro.end();
      mounted = false;
      dispose();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_else_block5.name,
    type: "else",
    source: "(191:3) {:else}",
    ctx
  });
  return block;
}
function create_if_block7(ctx) {
  let div0;
  let applyStyles_action;
  let div0_intro;
  let div0_outro;
  let t;
  let div1;
  let current;
  let mounted;
  let dispose;
  const default_slot_template = (
    /*#slots*/
    ctx[19].default
  );
  const default_slot = create_slot(
    default_slot_template,
    ctx,
    /*$$scope*/
    ctx[18],
    null
  );
  const block = {
    c: function create() {
      div0 = element("div");
      t = space();
      div1 = element("div");
      if (default_slot) default_slot.c();
      attr_dev(div0, "class", "tjs-glass-pane-background svelte-1yohjby");
      set_style(
        div0,
        "background",
        /*background*/
        ctx[5]
      );
      add_location(div0, file9, 180, 6, 6447);
      attr_dev(div1, "class", "tjs-glass-pane-container svelte-1yohjby");
      add_location(div1, file9, 187, 6, 6726);
    },
    m: function mount(target, anchor) {
      insert_dev(target, div0, anchor);
      ctx[23](div0);
      insert_dev(target, t, anchor);
      insert_dev(target, div1, anchor);
      if (default_slot) {
        default_slot.m(div1, null);
      }
      ctx[24](div1);
      current = true;
      if (!mounted) {
        dispose = action_destroyer(applyStyles_action = applyStyles.call(
          null,
          div0,
          /*styles*/
          ctx[7]
        ));
        mounted = true;
      }
    },
    p: function update(new_ctx, dirty) {
      ctx = new_ctx;
      if (applyStyles_action && is_function(applyStyles_action.update) && dirty & /*styles*/
      128) applyStyles_action.update.call(
        null,
        /*styles*/
        ctx[7]
      );
      if (dirty & /*background*/
      32) {
        set_style(
          div0,
          "background",
          /*background*/
          ctx[5]
        );
      }
      if (default_slot) {
        if (default_slot.p && (!current || dirty & /*$$scope*/
        262144)) {
          update_slot_base(
            default_slot,
            default_slot_template,
            ctx,
            /*$$scope*/
            ctx[18],
            !current ? get_all_dirty_from_scope(
              /*$$scope*/
              ctx[18]
            ) : get_slot_changes(
              default_slot_template,
              /*$$scope*/
              ctx[18],
              dirty,
              null
            ),
            null
          );
        }
      }
    },
    i: function intro(local) {
      if (current) return;
      add_render_callback(() => {
        if (!current) return;
        if (div0_outro) div0_outro.end(1);
        div0_intro = create_in_transition(
          div0,
          /*inTransition*/
          ctx[1],
          /*inTransitionOptions*/
          ctx[3]
        );
        div0_intro.start();
      });
      transition_in(default_slot, local);
      current = true;
    },
    o: function outro(local) {
      if (div0_intro) div0_intro.invalidate();
      div0_outro = create_out_transition(
        div0,
        /*outTransition*/
        ctx[2],
        /*outTransitionOptions*/
        ctx[4]
      );
      transition_out(default_slot, local);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div0);
        detach_dev(t);
        detach_dev(div1);
      }
      ctx[23](null);
      if (detaching && div0_outro) div0_outro.end();
      if (default_slot) default_slot.d(detaching);
      ctx[24](null);
      mounted = false;
      dispose();
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_if_block7.name,
    type: "if",
    source: "(180:3) {#if slotSeparate}",
    ctx
  });
  return block;
}
function create_fragment10(ctx) {
  let div;
  let current_block_type_index;
  let if_block;
  let current;
  let mounted;
  let dispose;
  const if_block_creators = [create_if_block7, create_else_block5];
  const if_blocks = [];
  function select_block_type(ctx2, dirty) {
    if (
      /*slotSeparate*/
      ctx2[0]
    ) return 0;
    return 1;
  }
  current_block_type_index = select_block_type(ctx, -1);
  if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  const block = {
    c: function create() {
      div = element("div");
      if_block.c();
      attr_dev(
        div,
        "id",
        /*id*/
        ctx[6]
      );
      attr_dev(div, "class", "tjs-glass-pane svelte-1yohjby");
      attr_dev(div, "popover", "manual");
      add_location(div, file9, 171, 0, 6242);
    },
    l: function claim(nodes) {
      throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    },
    m: function mount(target, anchor) {
      insert_dev(target, div, anchor);
      if_blocks[current_block_type_index].m(div, null);
      ctx[26](div);
      current = true;
      if (!mounted) {
        dispose = [
          listen_dev(
            window,
            "contextmenu",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "click",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "dblclick",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "keydown",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "keyup",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "mousedown",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "mousemove",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "mouseup",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "pointerdown",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "pointermove",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "pointerup",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "touchend",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "touchmove",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "touchstart",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            window,
            "wheel",
            /*swallow*/
            ctx[11],
            true,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "glasspane:close",
            /*glasspane_close_handler*/
            ctx[20],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "glasspane:keydown:escape",
            /*glasspane_keydown_escape_handler*/
            ctx[21],
            false,
            false,
            false,
            false
          ),
          listen_dev(
            div,
            "glasspane:pointerdown",
            /*glasspane_pointerdown_handler*/
            ctx[22],
            false,
            false,
            false,
            false
          )
        ];
        mounted = true;
      }
    },
    p: function update(ctx2, [dirty]) {
      let previous_block_index = current_block_type_index;
      current_block_type_index = select_block_type(ctx2, dirty);
      if (current_block_type_index === previous_block_index) {
        if_blocks[current_block_type_index].p(ctx2, dirty);
      } else {
        group_outros();
        transition_out(if_blocks[previous_block_index], 1, 1, () => {
          if_blocks[previous_block_index] = null;
        });
        check_outros();
        if_block = if_blocks[current_block_type_index];
        if (!if_block) {
          if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx2);
          if_block.c();
        } else {
          if_block.p(ctx2, dirty);
        }
        transition_in(if_block, 1);
        if_block.m(div, null);
      }
      if (!current || dirty & /*id*/
      64) {
        attr_dev(
          div,
          "id",
          /*id*/
          ctx2[6]
        );
      }
    },
    i: function intro(local) {
      if (current) return;
      transition_in(if_block);
      current = true;
    },
    o: function outro(local) {
      transition_out(if_block);
      current = false;
    },
    d: function destroy(detaching) {
      if (detaching) {
        detach_dev(div);
      }
      if_blocks[current_block_type_index].d();
      ctx[26](null);
      mounted = false;
      run_all(dispose);
    }
  };
  dispatch_dev("SvelteRegisterBlock", {
    block,
    id: create_fragment10.name,
    type: "component",
    source: "",
    ctx
  });
  return block;
}
function instance10($$self, $$props, $$invalidate) {
  let { $$slots: slots = {}, $$scope } = $$props;
  validate_slots("TJSGlassPane", slots, ["default"]);
  let { background = "#50505080" } = $$props;
  let { captureInput = true } = $$props;
  let { closeOnInput = void 0 } = $$props;
  let { id = void 0 } = $$props;
  let { slotSeparate = void 0 } = $$props;
  let { styles = void 0 } = $$props;
  let backgroundEl, containerEl, glassPaneEl;
  let { transition = void 0 } = $$props;
  let { inTransition = void 0 } = $$props;
  let { outTransition = void 0 } = $$props;
  let { transitionOptions = void 0 } = $$props;
  let { inTransitionOptions = TJSDefaultTransition.options } = $$props;
  let { outTransitionOptions = TJSDefaultTransition.options } = $$props;
  let oldTransition = void 0;
  let oldTransitionOptions = void 0;
  onMount(() => {
    glassPaneEl.showPopover();
  });
  function swallow(event) {
    const targetEl = event.target;
    if (event?.type === "keydown" && event?.code === "Escape") {
      glassPaneEl.dispatchEvent(new CustomEvent("glasspane:keydown:escape", { bubbles: true, cancelable: true }));
    }
    if (targetEl !== glassPaneEl && targetEl !== backgroundEl && targetEl !== containerEl && glassPaneEl.contains(CrossWindow.isNode(targetEl) ? targetEl : null)) {
      return;
    }
    if (captureInput) {
      if (event?.type !== "wheel") {
        event.preventDefault();
      }
      event.stopImmediatePropagation();
    }
    if (event?.type === "pointerdown") {
      glassPaneEl.dispatchEvent(new CustomEvent("glasspane:pointerdown", { bubbles: true, cancelable: true }));
      if (closeOnInput) {
        glassPaneEl.dispatchEvent(new CustomEvent("glasspane:close", { bubbles: true, cancelable: true }));
      }
    }
  }
  const writable_props = [
    "background",
    "captureInput",
    "closeOnInput",
    "id",
    "slotSeparate",
    "styles",
    "transition",
    "inTransition",
    "outTransition",
    "transitionOptions",
    "inTransitionOptions",
    "outTransitionOptions"
  ];
  Object.keys($$props).forEach((key) => {
    if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$" && key !== "slot") console.warn(`<TJSGlassPane> was created with unknown prop '${key}'`);
  });
  function glasspane_close_handler(event) {
    bubble.call(this, $$self, event);
  }
  function glasspane_keydown_escape_handler(event) {
    bubble.call(this, $$self, event);
  }
  function glasspane_pointerdown_handler(event) {
    bubble.call(this, $$self, event);
  }
  function div0_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      backgroundEl = $$value;
      $$invalidate(8, backgroundEl);
    });
  }
  function div1_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      containerEl = $$value;
      $$invalidate(9, containerEl);
    });
  }
  function div_binding($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      backgroundEl = $$value;
      $$invalidate(8, backgroundEl);
    });
  }
  function div_binding_1($$value) {
    binding_callbacks[$$value ? "unshift" : "push"](() => {
      glassPaneEl = $$value;
      $$invalidate(10, glassPaneEl);
    });
  }
  $$self.$$set = ($$props2) => {
    if ("background" in $$props2) $$invalidate(5, background = $$props2.background);
    if ("captureInput" in $$props2) $$invalidate(12, captureInput = $$props2.captureInput);
    if ("closeOnInput" in $$props2) $$invalidate(13, closeOnInput = $$props2.closeOnInput);
    if ("id" in $$props2) $$invalidate(6, id = $$props2.id);
    if ("slotSeparate" in $$props2) $$invalidate(0, slotSeparate = $$props2.slotSeparate);
    if ("styles" in $$props2) $$invalidate(7, styles = $$props2.styles);
    if ("transition" in $$props2) $$invalidate(14, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(1, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(2, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(15, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(3, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(4, outTransitionOptions = $$props2.outTransitionOptions);
    if ("$$scope" in $$props2) $$invalidate(18, $$scope = $$props2.$$scope);
  };
  $$self.$capture_state = () => ({
    onMount,
    applyStyles,
    TJSDefaultTransition,
    CrossWindow,
    isObject,
    background,
    captureInput,
    closeOnInput,
    id,
    slotSeparate,
    styles,
    backgroundEl,
    containerEl,
    glassPaneEl,
    transition,
    inTransition,
    outTransition,
    transitionOptions,
    inTransitionOptions,
    outTransitionOptions,
    oldTransition,
    oldTransitionOptions,
    swallow
  });
  $$self.$inject_state = ($$props2) => {
    if ("background" in $$props2) $$invalidate(5, background = $$props2.background);
    if ("captureInput" in $$props2) $$invalidate(12, captureInput = $$props2.captureInput);
    if ("closeOnInput" in $$props2) $$invalidate(13, closeOnInput = $$props2.closeOnInput);
    if ("id" in $$props2) $$invalidate(6, id = $$props2.id);
    if ("slotSeparate" in $$props2) $$invalidate(0, slotSeparate = $$props2.slotSeparate);
    if ("styles" in $$props2) $$invalidate(7, styles = $$props2.styles);
    if ("backgroundEl" in $$props2) $$invalidate(8, backgroundEl = $$props2.backgroundEl);
    if ("containerEl" in $$props2) $$invalidate(9, containerEl = $$props2.containerEl);
    if ("glassPaneEl" in $$props2) $$invalidate(10, glassPaneEl = $$props2.glassPaneEl);
    if ("transition" in $$props2) $$invalidate(14, transition = $$props2.transition);
    if ("inTransition" in $$props2) $$invalidate(1, inTransition = $$props2.inTransition);
    if ("outTransition" in $$props2) $$invalidate(2, outTransition = $$props2.outTransition);
    if ("transitionOptions" in $$props2) $$invalidate(15, transitionOptions = $$props2.transitionOptions);
    if ("inTransitionOptions" in $$props2) $$invalidate(3, inTransitionOptions = $$props2.inTransitionOptions);
    if ("outTransitionOptions" in $$props2) $$invalidate(4, outTransitionOptions = $$props2.outTransitionOptions);
    if ("oldTransition" in $$props2) $$invalidate(16, oldTransition = $$props2.oldTransition);
    if ("oldTransitionOptions" in $$props2) $$invalidate(17, oldTransitionOptions = $$props2.oldTransitionOptions);
  };
  if ($$props && "$$inject" in $$props) {
    $$self.$inject_state($$props.$$inject);
  }
  $$self.$$.update = () => {
    if ($$self.$$.dirty & /*slotSeparate*/
    1) {
      $: $$invalidate(0, slotSeparate = typeof slotSeparate === "boolean" ? slotSeparate : false);
    }
    if ($$self.$$.dirty & /*oldTransition, transition*/
    81920) {
      $: if (oldTransition !== transition) {
        const newTransition = typeof transition === "function" ? transition : void 0;
        $$invalidate(1, inTransition = newTransition);
        $$invalidate(2, outTransition = newTransition);
        $$invalidate(16, oldTransition = newTransition);
      }
    }
    if ($$self.$$.dirty & /*oldTransitionOptions, transitionOptions*/
    163840) {
      $: if (oldTransitionOptions !== transitionOptions) {
        const newOptions = transitionOptions !== TJSDefaultTransition.options && isObject(transitionOptions) ? transitionOptions : TJSDefaultTransition.options;
        $$invalidate(3, inTransitionOptions = newOptions);
        $$invalidate(4, outTransitionOptions = newOptions);
        $$invalidate(17, oldTransitionOptions = newOptions);
      }
    }
    if ($$self.$$.dirty & /*inTransition*/
    2) {
      $: if (typeof inTransition !== "function") {
        $$invalidate(1, inTransition = void 0);
      }
    }
    if ($$self.$$.dirty & /*outTransition*/
    4) {
      $: if (typeof outTransition !== "function") {
        $$invalidate(2, outTransition = void 0);
      }
    }
    if ($$self.$$.dirty & /*inTransitionOptions*/
    8) {
      $: if (!isObject(inTransitionOptions)) {
        $$invalidate(3, inTransitionOptions = TJSDefaultTransition.options);
      }
    }
    if ($$self.$$.dirty & /*outTransitionOptions*/
    16) {
      $: if (!isObject(outTransitionOptions)) {
        $$invalidate(4, outTransitionOptions = TJSDefaultTransition.options);
      }
    }
  };
  return [
    slotSeparate,
    inTransition,
    outTransition,
    inTransitionOptions,
    outTransitionOptions,
    background,
    id,
    styles,
    backgroundEl,
    containerEl,
    glassPaneEl,
    swallow,
    captureInput,
    closeOnInput,
    transition,
    transitionOptions,
    oldTransition,
    oldTransitionOptions,
    $$scope,
    slots,
    glasspane_close_handler,
    glasspane_keydown_escape_handler,
    glasspane_pointerdown_handler,
    div0_binding,
    div1_binding,
    div_binding,
    div_binding_1
  ];
}
var TJSGlassPane = class extends SvelteComponentDev {
  constructor(options) {
    super(options);
    init(
      this,
      options,
      instance10,
      create_fragment10,
      safe_not_equal,
      {
        background: 5,
        captureInput: 12,
        closeOnInput: 13,
        id: 6,
        slotSeparate: 0,
        styles: 7,
        transition: 14,
        inTransition: 1,
        outTransition: 2,
        transitionOptions: 15,
        inTransitionOptions: 3,
        outTransitionOptions: 4
      },
      add_css9
    );
    dispatch_dev("SvelteRegisterComponent", {
      component: this,
      tagName: "TJSGlassPane",
      options,
      id: create_fragment10.name
    });
  }
  get background() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set background(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get captureInput() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set captureInput(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get closeOnInput() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set closeOnInput(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get id() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set id(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get slotSeparate() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set slotSeparate(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get styles() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set styles(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get transition() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set transition(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get inTransition() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set inTransition(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get outTransition() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set outTransition(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get transitionOptions() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set transitionOptions(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get inTransitionOptions() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set inTransitionOptions(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  get outTransitionOptions() {
    throw new Error("<TJSGlassPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
  set outTransitionOptions(value) {
    throw new Error("<TJSGlassPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
  }
};
var TJSGlassPane_default = TJSGlassPane;

// node_modules/@typhonjs-fvtt/runtime/_dist/svelte/component/application/index.js
Hooks.once("init", () => FVTTConfigure.initialize());

export {
  ApplicationShell_default,
  EmptyApplicationShell_default,
  TJSApplicationShell_default,
  TJSGlassPane_default,
  FoundryStyles,
  SvelteApp,
  ThemeObserver,
  TJSDialog
};
/*! Bundled license information:

@typhonjs-fvtt/runtime/_dist/math/gl-matrix/index.js:
  (* @license MIT (https://github.com/toji/gl-matrix/blob/master/LICENSE.md) *)
*/
//# sourceMappingURL=chunk-5W23VKWQ.js.map
