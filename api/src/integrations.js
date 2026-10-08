const chainMode = process.env.CHAIN_MODE === 'real';
const ocrMode = process.env.OCR_MODE === 'real';

module.exports = {
  chain: chainMode ? require('../../chain/wrapper') : require('./stubs/chain'),
  ocr: ocrMode ? require('../../ocr') : require('./stubs/ocr')
};
