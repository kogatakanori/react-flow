define run
	docker compose run --rm client sh -c "$1"
endef

setup:
	GOOGLE_PROJECT_ID="{your_project_id}" sh scripts/setup.sh

build:
	DOCKER_TARGET=local docker compose build --no-cache
	make down

install:
	$(call run, npm install)
	make down

audit:
	$(call run, npm audit fix --force)
	make down

up:
	DOCKER_TARGET=local docker compose up

down:
	docker compose down

sh:
	docker compose exec client bash

logs:
	docker compose logs -f client

lint:
	$(call run, npm run lint)

test:
	$(call run, npm run test)
