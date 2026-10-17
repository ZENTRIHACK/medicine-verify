// chain/wrapper.js — interface contract placeholder
// Replace this file when the real blockchain integration is ready.
// Until then, CHAIN_MODE=real will validate call shapes and throw.

function assertArrayOfStrings(arg, name) {
  if (!Array.isArray(arg) || arg.some((v) => typeof v !== 'string'))
    throw new TypeError(`${name} must be a non-empty string array`);
}

const addActor = async (actorData) => {
  throw new Error('[chain/wrapper] addActor not implemented');
};

const registerPacks = async (serials, opts) => {
  assertArrayOfStrings(serials, 'serials');
  if (!opts?.actor || !opts?.batchNo) throw new TypeError('registerPacks requires { actor, batchNo }');
  throw new Error('[chain/wrapper] registerPacks not implemented');
};

const transfer = async (serials, opts) => {
  assertArrayOfStrings(serials, 'serials');
  if (!opts?.from || !opts?.to) throw new TypeError('transfer requires { from, to }');
  throw new Error('[chain/wrapper] transfer not implemented');
};

const dispense = async (serials, opts) => {
  assertArrayOfStrings(serials, 'serials');
  if (!opts?.actor) throw new TypeError('dispense requires { actor }');
  throw new Error('[chain/wrapper] dispense not implemented');
};

const getPack = async (serial) => {
  if (typeof serial !== 'string') throw new TypeError('getPack requires a serial string');
  throw new Error('[chain/wrapper] getPack not implemented');
};

module.exports = { addActor, registerPacks, transfer, dispense, getPack };
