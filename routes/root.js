const http = require("http");
const CacheableLookup = require("cacheable-lookup");

const cacheable = new CacheableLookup();
cacheable.install(http.globalAgent);
cacheable.servers = require("../config.json").nameservers;

module.exports = async function (fastify, opts) {
	fastify.addContentTypeParser(
		"*",

		function (req, body, done) {
			try {
				done(null, body);
			} catch (error) {
				error.statusCode = 400;
				done(error, undefined);
			}
		}
	);
	fastify.all("*", async function (request, reply) {
		let hnsName = request.hostname;
		// hnsName = "fsdfjsjfsdfsdfs7dsfs6fsjkal.shaked.xyz"
		// 	.split(".")
		// 	.slice(0, -2)
		// 	.join(".");

		if (hnsName == "")
			return reply.redirect(
				301,
				"https://github.com/angrymouse/shaked-hns-bridge"
			);
		let headers = request.headers;
		headers["x-real-ip"] = request.ip;
		delete headers.host;
		try {
			let resource = http.request(
				{
					hostname: hnsName,
					headers: headers,
					lookup: cacheable.lookup,

					method: request.method,
					path: request.path,
				},
				(res) => {
					reply.raw.writeHead(res.statusCode, res.headers);

					res.on("data", (data) => {
						reply.raw.write(data);
					});
					res.on("end", () => {
						reply.raw.end();
					});
				}
			);

			resource.once("error", () => {
				return reply.redirect(
					302,
					"https://www.namebase.io/domains/" + hnsName
				);
			});
			if (["PUT", "PATCH", "POST"].includes(request.method)) {
				resource.write(request.body);
			}
			resource.end();
		} catch (error) {
			return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
		}
	});
};
