// Bootstrap entrypoint for ARIA backend.
// All routes and MongoDB logic live in `src/index.js`.
// This file exists so that `npm start` / `npm run dev` keep working.
//
// Usage:
//   PORT=5001 npm run dev
// Then open:
//   http://localhost:5001/demo

require('./src/index.js');

