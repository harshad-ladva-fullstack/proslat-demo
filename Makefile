d_node_install:
	echo "node_install" && \
	docker run --rm -it \
		-v `pwd`:/app \
		-w /app \
		--user $$(id -u ubuntu):$$(id -g ubuntu) \
		node:21 bash -ci " \
		    npm ci \
		"

d_node_build:
	echo "node_build" && \
	docker run --rm -it \
		-v `pwd`:/app \
		-w /app \
		--user $$(id -u ubuntu):$$(id -g ubuntu) \
		node:21 bash -ci " \
		    npm run build \
		"
