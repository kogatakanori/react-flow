define run
	docker compose run --rm app sh -c "$1"
endef

setup:
	sh scripts/setup.sh

init:
	DOCKER_TARGET=base docker compose build
	make install
	make down

audit:
	$(call run, npm audit fix)
	make down

install:
	$(call run, npm install)
	make down

up:
	DOCKER_TARGET=local docker compose up

down:
	docker compose down

build: # prodiction build
	$(call run, npm run build)

sh:
	docker compose exec app bash

logs:
	docker compose logs -f app

lint:
	$(call run, npm run lint)

test:
	$(call run, npm run test)
