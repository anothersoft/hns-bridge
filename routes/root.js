const http = require("http");
const hyperquest = require("hyperquest");
// const dns = require("hdns");

const CacheableLookup = require("cacheable-lookup");
const config = require("../config.json");
const { Resolver } = require("dns");
const resolver = new Resolver();
resolver.setServers(config.nameservers);
const cacheable = new CacheableLookup();
const fs = require("fs");

cacheable.servers = config.nameservers;
// dns.setServers(config.nameservers);
let path = require("path");
cacheable.lookup("mousy.", {}, (err, res) => {
	console.log(err, res);
});
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

	fastify.all("*", function (request, reply) {
		let hostname = request.hostname; //I really need it for debug, don't remove and make PR!!!
		let domainMapArray = Object.keys(config.domainMap);
		domainMapArray.sort((a, b) => b.length - a.length);
		let targetDomain = domainMapArray.find((domain) =>
			hostname.endsWith(domain)
		);
		if (!hostname || !targetDomain) {
			return reply.redirect(301, require("../config.json").rootRedirect);
		}
		let hnsName =
			hostname.slice(0, hostname.length - targetDomain.length) + //"-1" means remove "."
			config.domainMap[targetDomain];

		if (hnsName == "") {
			if (config.defaultDomain) {
				hnsName = config.defaultDomain;
			} else {
				return reply.redirect(301, require("../config.json").rootRedirect);
			}
		}
		let headers = request.headers;

		delete headers.host;
		try {
			let resource = hyperquest(
				{
					hostname: hnsName,
					headers: headers,
					lookup: cacheable.lookup,

					method: request.method,
					path: request.url,
				},
				(err, res) => {
					reply.raw.writeHead(res.statusCode, res.headers);

					res.on("data", (data) => {
						reply.raw.write(data);
					});
					res.on("end", () => {
						reply.raw.end();
					});
					return;
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
		} catch (error) {
			return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
		}
	});
};
