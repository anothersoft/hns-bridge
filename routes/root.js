
const http = require("http");
const { RecursiveResolver, StubResolver } = require('bns-plus');
const dns = require("dns")
const config = require("../config.json");
const resolver = new StubResolver({
	tcp: true,
	inet6: true,
	edns: true,
	dnssec: true
});
// console.log(dns.Resolver)
// let Resolver = dns.Resolver;
// const recursive = new Resolver();

resolver.setServers(

	config.nameservers
);



// const lru = new QuickLRU({ maxSize: 1000 });
// const cacheable = { lookup: recursive.lookup }


const fs = require("fs");


// cacheable.servers = config.nameservers;
// recursive.setServers(config.nameservers);

// dns.setServers(config.nameservers);
let path = require("path");

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
		// return "On maintainance"
		(async () => {

			let hostname = request.hostname; //I really need it for debug, don't remove and make PR!!!
			let domainMapArray = Object.keys(config.domainMap);
			domainMapArray.sort((a, b) => b.length - a.length);
			if (!hostname) {
				return reply.redirect(301, require("../config.json").rootRedirect);
			}
			let targetDomain = domainMapArray.find((domain) =>
				hostname.endsWith(domain)
			);
			if (!hostname || !targetDomain) {
				return reply.redirect(301, require("../config.json").rootRedirect);
			}
			let hnsName =
				hostname.slice(0, hostname.length - targetDomain.length) + //"-1" means remove "."
				config.domainMap[targetDomain];
			if (["av4.us.av4.us.", "central.p101.", "bluecherry."].includes(hnsName)) { return "blocked" }
			if (hnsName == "") {
				if (config.defaultDomain) {
					hnsName = config.defaultDomain;
				} else {
					return reply.redirect(301, require("../config.json").rootRedirect);
				}
			}

			if (hnsName.endsWith(".hns.")) {
				hnsName = hnsName.slice(0, hnsName.length - "hns.".length);
			}
			let headers = request.headers;

			delete headers.host
			processNormally(hnsName, headers, request, reply);

		})();
	});
};
async function processNormally(hnsName, headers, request, reply) {
	try {

		// console.log(hnsName, await cacheable.lookupAsync(hnsName))
		let resource = http.request(
			{
				hostname: await asyncHandshakeResolve(hnsName),
				headers: { ...headers, "Host": hnsName },
				lookup: handshakeResolve,

				method: request.method,
				path: request.url,
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

		resource.once("error", (e) => {
			console.log(e)
			return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
		});
		if (["PUT", "PATCH", "POST"].includes(request.method)) {
			resource.write(request.body);
		}
		resource.end();
	} catch (error) {
		console.log(error)
		return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
	}
}
function handshakeResolve(name, type, cb) {
	(async () => {

		const res = await resolver.lookup(name, "A");
		cb(res.answer.find(rsp => rsp.type == 1)?.data?.address)
	})()
}
async function asyncHandshakeResolve(name, type, cb) {


	const res = await resolver.lookup(name, "A");
	return res.answer.find(rsp => rsp.type == 1)?.data?.address

}