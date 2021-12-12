let fastify = require("fastify")({ logger: true });
const path = require("path");
const AutoLoad = require("fastify-autoload");
const config = require("./config.json");

// Place here your custom code!

// Do not touch the following lines

// This loads all plugins defined in plugins
// those should be support plugins that are reused
// through your application
fastify.register(AutoLoad, {
	dir: path.join(__dirname, "plugins"),
	options: Object.assign({}, {}),
});

// This loads all plugins defined in routes
// define your routes in one of these
fastify.register(AutoLoad, {
	dir: path.join(__dirname, "routes"),
	options: Object.assign({}, {}),
});
fastify.listen(config.port, "0.0.0.0");
