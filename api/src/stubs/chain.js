const crypto = require('crypto');

const addActor = async () => ({});

const registerPacks = async () => ({ 
  txHash: "0x" + crypto.randomBytes(32).toString('hex') 
});

const transfer = async () => ({ 
  txHash: "0x" + crypto.randomBytes(32).toString('hex') 
});

const dispense = async () => ({ 
  txHash: "0x" + crypto.randomBytes(32).toString('hex'), 
  result: "ok" 
});

const getPack = async () => ({});

module.exports = {
  addActor,
  registerPacks,
  transfer,
  dispense,
  getPack
};
