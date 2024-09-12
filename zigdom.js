const zigdom = {
  objects: [],
  exports: undefined,
};

window.zigdom = zigdom;

function getString(ptr, len) {
  const slice = zigdom.exports.memory.buffer.slice(ptr, ptr + len);
  const textDecoder = new TextDecoder();
  return textDecoder.decode(slice);
}

function pushObject(object) {
  return zigdom.objects.push(object);
}

function getObject(objId) {
  return zigdom.objects[objId - 1];
}

function dispatch(eventId) {
  return function () {
    zigdom.exports.dispatch_event(eventId);
  };
}

function elementSetAttribute(
  node_id,
  name_ptr,
  name_len,
  value_ptr,
  value_len,
) {
  const node = getObject(node_id);
  const attribute_name = getString(name_ptr, name_len);
  const value = getString(value_ptr, value_len);
  node[attribute_name] = value;
}

function writeU32ToMemory(memory, address, value) {
  const mem_result_address = new DataView(memory.buffer, address, 4);
  mem_result_address.setUint32(0, value, true);
}

function elementGetAttribute(
  node_id,
  name_ptr,
  name_len,
  result_address_ptr,
  result_address_len_ptr,
) {
  const node = getObject(node_id);
  const attribute_name = getString(name_ptr, name_len);
  const result = node[attribute_name];
  // convert result into Uint8Array
  const textEncoder = new TextEncoder();
  const resultArray = textEncoder.encode(result);
  const len = resultArray.length;

  if (len === 0) {
    return false;
  }

  // allocate required number of bytes
  const ptr = zigdom.exports._wasm_alloc(len);
  if (ptr === 0) {
    throw 'Cannot allocate memory';
  }

  const uint8array = new Uint8Array(zigdom.exports.memory.buffer);
  uint8array.set(resultArray, ptr);

  // write the address of the result array to result_address_ptr
  writeU32ToMemory(zigdom.exports.memory, result_address_ptr, ptr);

  // write the size of the result array to result_address_ptr_len_ptr
  writeU32ToMemory(zigdom.exports.memory, result_address_len_ptr, len);

  // return if success? (optional)
  return true;
}

function eventTargetAddEventListener(objId, event_ptr, event_len, eventId) {
  const node = getObject(objId);
  const ev = getString(event_ptr, event_len);
  node.addEventListener(ev, dispatch(eventId));
}

function documentQuerySelector(selector_ptr, selector_len) {
  const selector = getString(selector_ptr, selector_len);
  return pushObject(document.querySelector(selector));
}

function documentCreateElement(tag_name_ptr, tag_name_len) {
  const tag_name = getString(tag_name_ptr, tag_name_len);
  return pushObject(document.createElement(tag_name));
}

function documentCreateTextNode(data_ptr, data_len) {
  const data = getString(data_ptr, data_len);
  return pushObject(document.createTextNode(data));
}

function nodeAppendChild(node_id, child_id) {
  const node = getObject(node_id);
  const child = getObject(child_id);

  if (node === undefined || child === undefined) {
    return 0;
  }

  return pushObject(node.appendChild(child));
}

function windowAlert(msg_ptr, msg_len) {
  const msg = getString(msg_ptr, msg_len);
  // console.log('>', msg);
  alert(msg);
}

function zigReleaseObject(object_id) {
  zigdom.objects[object_id - 1] = undefined;
}

function launch(wasmInstance) {
  zigdom.exports = wasmInstance.instance.exports;

  if (!zigdom.exports.launch_export()) {
    throw 'Launch Error';
  }
}

const wasmImports = {
  document: {
    query_selector: documentQuerySelector,
    create_element: documentCreateElement,
    create_text_node: documentCreateTextNode,
  },
  element: {
    set_attribute: elementSetAttribute,
    get_attribute: elementGetAttribute,
  },
  event_target: {
    add_event_listener: eventTargetAddEventListener,
  },
  node: {
    append_child: nodeAppendChild,
  },
  window: {
    alert: windowAlert,
  },
  zig: {
    release_object: zigReleaseObject,
  },
};

async function run() {
  const response = await fetch('zig-out/bin/zigdom.wasm');

  if (!response.ok) {
    throw new Error("wasm file can't be loaded");
  }

  const buffer = await response.arrayBuffer();
  const instance = await WebAssembly.instantiate(buffer, wasmImports);

  launch(instance);
}

run();
