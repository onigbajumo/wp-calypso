package _self.projects

import _self.bashNodeScript
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildStep
import jetbrains.buildServer.configs.kotlin.v2019_2.BuildType
import jetbrains.buildServer.configs.kotlin.v2019_2.FailureAction
import jetbrains.buildServer.configs.kotlin.v2019_2.Project
import jetbrains.buildServer.configs.kotlin.v2019_2.buildFeatures.*
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.ScriptBuildStep
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.dockerCommand
import jetbrains.buildServer.configs.kotlin.v2019_2.buildSteps.script
import jetbrains.buildServer.configs.kotlin.v2019_2.failureConditions.*
import jetbrains.buildServer.configs.kotlin.v2019_2.triggers.vcs

object WebApp : Project({
	id("WebApp")
	name = "Web app"

	buildType(RunAllUnitTests)
	buildType(CheckCodeStyleBranch)
	buildType(BuildDockerImage)
	buildType(seleniumBuildType("desktop", "52f38738-92b2-43cb-b7fb-19fce03cb67c"));
	buildType(seleniumBuildType("mobile", "04de2dd8-9896-4917-b31d-c04eb1c8ecdb"));
	buildType(playwrightPrBuildType("desktop", "23cc069f-59e5-4a63-a131-539fb55264e7"));
	buildType(playwrightPrBuildType("mobile", "90fbd6b7-fddb-4668-9ed0-b32598143616"));
	buildType(PreReleaseE2ETests)
})

object BuildDockerImage : BuildType({
	uuid = "89fff49e-c79b-4e68-a012-a7ba405359b6"
	name = "Docker image"
	description = "Build docker image containing Calypso"

	params {
		text("base_image", "registry.a8c.com/calypso/base:latest", label = "Base docker image", description = "Base docker image", allowEmpty = false)
	}

	vcs {
		root(Settings.WpCalypso)
		cleanCheckout = true
	}

	steps {
		script {
			name = "Post PR comment"
			scriptContent = """
				#!/usr/bin/env bash
				if [[ "%teamcity.build.branch.is_default%" == "true" ]]; then
					exit 0
				fi

				export GH_TOKEN="%matticbot_oauth_token%"
				chmod +x ./bin/add-pr-comment.sh
				./bin/add-pr-comment.sh "%teamcity.build.branch%" "calypso-live" <<- EOF || true
				Link to live branch is being generated...
				Please wait a few minutes and refresh this page.
				EOF
			"""
		}

		script {
			name = "Restore git mtime"
			scriptContent = """
				#!/usr/bin/env bash
				sudo apt-get install -y git-restore-mtime
				/usr/lib/git-core/git-restore-mtime --force --commit-time --skip-missing
			"""
			dockerImage = "%docker_image_e2e%"
			dockerRunParameters = "-u %env.UID%"
			dockerPull = true
			dockerImagePlatform = ScriptBuildStep.ImagePlatform.Linux
		}

		dockerCommand {
			name = "Build docker image"
			commandType = build {
				source = file {
					path = "Dockerfile"
				}
				namesAndTags = """
					registry.a8c.com/calypso/app:build-%build.number%
					registry.a8c.com/calypso/app:commit-${Settings.WpCalypso.paramRefs.buildVcsNumber}
				""".trimIndent()
				commandArgs = """
					--pull
					--label com.a8c.image-builder=teamcity
					--label com.a8c.target=calypso-live
					--label com.a8c.build-id=%teamcity.build.id%
					--build-arg workers=32
					--build-arg node_memory=32768
					--build-arg use_cache=true
					--build-arg base_image=%base_image%
				""".trimIndent().replace("\n"," ")
			}
			param("dockerImage.platform", "linux")
		}

		dockerCommand {
			commandType = push {
				namesAndTags = """
					registry.a8c.com/calypso/app:build-%build.number%
					registry.a8c.com/calypso/app:commit-${Settings.WpCalypso.paramRefs.buildVcsNumber}
				""".trimIndent()
			}
		}

		script {
			name = "Post PR comment with link"
			scriptContent = """
				#!/usr/bin/env bash
				if [[ "%teamcity.build.branch.is_default%" == "true" ]]; then
					exit 0
				fi

				export GH_TOKEN="%matticbot_oauth_token%"
				chmod +x ./bin/add-pr-comment.sh
				./bin/add-pr-comment.sh "%teamcity.build.branch%" "calypso-live" <<- EOF || true
				Link to Calypso live: https://calypso.live?image=registry.a8c.com/calypso/app:build-%build.number%
				Link to Jetpack Cloud live: https://calypso.live?image=registry.a8c.com/calypso/app:build-%build.number%&env=jetpack
				EOF
			"""
		}
	}

	failureConditions {
		executionTimeoutMin = 20
	}

	features {
		perfmon {
		}
		pullRequests {
			vcsRootExtId = "${Settings.WpCalypso.id}"
			provider = github {
				authType = token {
					token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
				}
				filterAuthorRole = PullRequests.GitHubRoleFilter.EVERYBODY
			}
		}
	}
})

object RunAllUnitTests : BuildType({
	uuid = "beb75760-2786-472b-8909-ec33457bdece"
	name = "Unit tests"
	description = "Run unit tests (client + server + packages)"

	artifactRules = """
		test_results => test_results
		artifacts => artifacts
	""".trimIndent()

	vcs {
		root(Settings.WpCalypso)
		cleanCheckout = true
	}

	steps {
		bashNodeScript {
			name = "Prepare environment"
			scriptContent = """
				export NODE_ENV="test"

				# Install modules
				${_self.yarn_install_cmd}
			"""
		}
		bashNodeScript {
			name = "Prevent uncommited changes"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				export NODE_ENV="test"

				# Prevent uncommited changes
				DIRTY_FILES=${'$'}(git status --porcelain 2>/dev/null)
				if [ ! -z "${'$'}DIRTY_FILES" ]; then
					echo "Repository contains uncommitted changes: "
					echo "${'$'}DIRTY_FILES"
					echo "You need to checkout the branch, run 'yarn' and commit those files."
					exit 1
				fi
			"""
		}
		bashNodeScript {
			name = "Prevent duplicated packages"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				# Duplicated packages
				if ! DUPLICATED_PACKAGES=${'$'}(
					set +e
					yarn dedupe --check
				); then
					echo "Repository contains duplicated packages: "
					echo ""
					echo "${'$'}DUPLICATED_PACKAGES"
					echo ""
					echo "To fix them, you need to checkout the branch, run 'yarn dedupe',"
					echo "verify that the new packages work and commit the changes in 'yarn.lock'."
					exit 1
				else
					echo "No duplicated packages found."
				fi
			"""
		}
		bashNodeScript {
			name = "Run type checks"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				export NODE_ENV="test"

				# Run type checks
				yarn tsc --build packages/*/tsconfig.json
				yarn tsc --build apps/editing-toolkit/tsconfig.json
				yarn tsc --project client/landing/gutenboarding
			"""
		}
		bashNodeScript {
			name = "Run unit tests for client"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				export JEST_JUNIT_OUTPUT_NAME="results.xml"
				unset NODE_ENV
				unset CALYPSO_ENV

				# Run client tests
				JEST_JUNIT_OUTPUT_DIR="./test_results/client" yarn test-client --maxWorkers=${'$'}JEST_MAX_WORKERS --ci --reporters=default --reporters=jest-junit --silent
			"""
		}
		bashNodeScript {
			name = "Run unit tests for server"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				export JEST_JUNIT_OUTPUT_NAME="results.xml"
				unset NODE_ENV
				unset CALYPSO_ENV

				# Run server tests
				JEST_JUNIT_OUTPUT_DIR="./test_results/server" yarn test-server --maxWorkers=${'$'}JEST_MAX_WORKERS --ci --reporters=default --reporters=jest-junit --silent
			"""
		}
		bashNodeScript {
			name = "Run unit tests for packages"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				export JEST_JUNIT_OUTPUT_NAME="results.xml"
				unset NODE_ENV
				unset CALYPSO_ENV

				# Run packages tests
				JEST_JUNIT_OUTPUT_DIR="./test_results/packages" yarn test-packages --maxWorkers=${'$'}JEST_MAX_WORKERS --ci --reporters=default --reporters=jest-junit --silent
			"""
		}
		bashNodeScript {
			name = "Run unit tests for build tools"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				export JEST_JUNIT_OUTPUT_NAME="results.xml"
				unset NODE_ENV
				unset CALYPSO_ENV

				# Run build-tools tests
				JEST_JUNIT_OUTPUT_DIR="./test_results/build-tools" yarn test-build-tools --maxWorkers=${'$'}JEST_MAX_WORKERS --ci --reporters=default --reporters=jest-junit --silent
			"""
		}
		bashNodeScript {
			name = "Run storybook tests"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				set -x
				yarn components:storybook:start --ci --smoke-test
				yarn search:storybook:start --ci --smoke-test
				yarn composite-checkout:storybook:start --ci --smoke-test
			"""
		}
	}

	triggers {
		vcs {
			branchFilter = """
				+:*
				-:pull*
			""".trimIndent()
		}
	}

	failureConditions {
		executionTimeoutMin = 10
	}

	features {
		feature {
			type = "xml-report-plugin"
			param("xmlReportParsing.reportType", "junit")
			param("xmlReportParsing.reportDirs", "test_results/**/*.xml")
		}
		perfmon {
		}
		pullRequests {
			vcsRootExtId = "${Settings.WpCalypso.id}"
			provider = github {
				authType = token {
					token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
				}
				filterAuthorRole = PullRequests.GitHubRoleFilter.EVERYBODY
			}
		}
		commitStatusPublisher {
			vcsRootExtId = "${Settings.WpCalypso.id}"
			publisher = github {
				githubUrl = "https://api.github.com"
				authType = personalToken {
					token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
				}
			}
		}

		notifications {
			notifierSettings = slackNotifier {
				connection = "PROJECT_EXT_11"
				sendTo = "#team-calypso-bot"
				messageFormat = simpleMessageFormat()
			}
			branchFilter = """
				+:trunk
			""".trimIndent()
			buildFailedToStart = true
			buildFailed = true
			buildFinishedSuccessfully = true
			firstSuccessAfterFailure = true
			buildProbablyHanging = true
		}
	}
})

object CheckCodeStyleBranch : BuildType({
	uuid = "dfee7987-6bbc-4250-bb10-ef9dd7322bd2"
	name = "Code style"
	description = "Check code style"

	artifactRules = """
		checkstyle_results => checkstyle_results
	""".trimIndent()

	vcs {
		root(Settings.WpCalypso)
		cleanCheckout = true
	}

	steps {
		bashNodeScript {
			name = "Prepare environment"
			scriptContent = """
				export NODE_ENV="test"

				# Install modules
				${_self.yarn_install_cmd}
			"""
		}
		bashNodeScript {
			name = "Run linters"
			scriptContent = """
				export NODE_ENV="test"

				# Find files to lint
				if [ "%calypso.run_full_eslint%" = "true" ]; then
					FILES_TO_LINT="."
				else
					FILES_TO_LINT=${'$'}(git diff --name-only --diff-filter=d refs/remotes/origin/trunk...HEAD | grep -E '(\.[jt]sx?|\.md)${'$'}' || exit 0)
				fi
				echo "Files to lint:"
				echo ${'$'}FILES_TO_LINT
				echo ""

				# Lint files
				if [ ! -z "${'$'}FILES_TO_LINT" ]; then
					yarn run eslint --format checkstyle --output-file "./checkstyle_results/eslint/results.xml" ${'$'}FILES_TO_LINT
				fi
			"""
		}
	}

	triggers {
		vcs {
			branchFilter = """
				+:*
				-:trunk
				-:pull*
			""".trimIndent()
		}
	}

	failureConditions {
		executionTimeoutMin = 20
	}

	features {
		feature {
			type = "xml-report-plugin"
			param("xmlReportParsing.reportType", "checkstyle")
			param("xmlReportParsing.reportDirs", "checkstyle_results/**/*.xml")
			param("xmlReportParsing.verboseOutput", "true")
		}
		perfmon {
		}
		pullRequests {
			vcsRootExtId = "${Settings.WpCalypso.id}"
			provider = github {
				authType = token {
					token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
				}
				filterAuthorRole = PullRequests.GitHubRoleFilter.EVERYBODY
			}
		}
		commitStatusPublisher {
			vcsRootExtId = "${Settings.WpCalypso.id}"
			publisher = github {
				githubUrl = "https://api.github.com"
				authType = personalToken {
					token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
				}
			}
		}
	}
})

fun seleniumBuildType( viewportName: String, buildUuid: String): BuildType  {
	return BuildType {
		id("Calypso_E2E_Selenium_$viewportName")
		uuid = buildUuid
		name = "Selenium E2E Tests ($viewportName)"
		description = "Runs Calypso e2e tests in $viewportName size using Selenium"
		artifactRules = """
			reports => reports
			logs.tgz => logs.tgz
			screenshots => screenshots
		""".trimIndent()

		vcs {
			root(Settings.WpCalypso)
			cleanCheckout = true
		}

		steps {
			bashNodeScript {
				name = "Prepare environment"
				scriptContent = """
					export NODE_ENV="test"

					# Install modules
					${_self.yarn_install_cmd}

					# Build package
					yarn workspace @automattic/mocha-debug-reporter build
				"""
				dockerImage = "%docker_image_e2e%"
			}
			bashNodeScript {
				name = "Run e2e tests ($viewportName)"
				scriptContent = """
					shopt -s globstar
					set -x

					chmod +x ./bin/get-calypso-live-url.sh
					URL=${'$'}(./bin/get-calypso-live-url.sh ${BuildDockerImage.depParamRefs.buildNumber})
					if [[ ${'$'}? -ne 0 ]]; then
						// Command failed. URL contains stderr
						echo ${'$'}URL
						exit 1
					fi

					cd test/e2e
					mkdir temp

					export LIVEBRANCHES=true
					export NODE_CONFIG_ENV=test
					export TEST_VIDEO=true
					export HIGHLIGHT_ELEMENT=true

					# Instructs Magellan to not hide the output from individual `mocha` processes. This is required for
					# mocha-teamcity-reporter to work.
					export MAGELLANDEBUG=true

					# Decrypt config
					openssl aes-256-cbc -md sha1 -d -in ./config/encrypted.enc -out ./config/local-test.json -k "%CONFIG_E2E_ENCRYPTION_KEY%"

					# Run the test
					export BROWSERSIZE="$viewportName"
					export BROWSERLOCALE="en"
					export NODE_CONFIG="{\"calypsoBaseURL\":\"${'$'}{URL%/}\"}"

					yarn magellan --config=magellan-calypso.json --max_workers=%E2E_WORKERS% --local_browser=chrome --mocha_args="--reporter mocha-multi-reporters --reporter-options configFile=mocha-reporter.json"
				""".trimIndent()
				dockerImage = "%docker_image_e2e%"
				dockerRunParameters = "-u %env.UID% --security-opt seccomp=.teamcity/docker-seccomp.json --shm-size=8gb"
			}
			bashNodeScript {
				name = "Collect results"
				executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
				scriptContent = """
					set -x

					mkdir -p screenshots
					find test/e2e -type f -path '*/screenshots/*' -print0 | xargs -r -0 mv -t screenshots

					mkdir -p logs
					find test/e2e -name '*.log' -print0 | xargs -r -0 tar cvfz logs.tgz
				""".trimIndent()
				dockerImage = "%docker_image_e2e%"
			}
		}

		features {
			perfmon {
			}
			pullRequests {
				vcsRootExtId = "${Settings.WpCalypso.id}"
				provider = github {
					authType = token {
						token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
					}
					filterAuthorRole = PullRequests.GitHubRoleFilter.EVERYBODY
				}
			}
			commitStatusPublisher {
				vcsRootExtId = "${Settings.WpCalypso.id}"
				publisher = github {
					githubUrl = "https://api.github.com"
					authType = personalToken {
						token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
					}
				}
			}
		}

		triggers {
			vcs {
				branchFilter = """
					+:*
					-:pull*
				""".trimIndent()
			}
		}

		failureConditions {
			executionTimeoutMin = 20
			// TeamCity will mute a test if it fails and then succeeds within the same build. Otherwise TeamCity UI will not
			// display a difference between real errors and retries, making it hard to understand what is actually failing.
			supportTestRetry = true

			// Don't fail if the runner exists with a non zero code. This allows a build to pass if the failed tests have
			// been muted previously.
			nonZeroExitCode = false

			// Fail if the number of passing tests is 50% or less than the last build. This will catch the case where the test runner
			// crashes and no tests are run.
			failOnMetricChange {
				metric = BuildFailureOnMetric.MetricType.PASSED_TEST_COUNT
				threshold = 50
				units = BuildFailureOnMetric.MetricUnit.PERCENTS
				comparison = BuildFailureOnMetric.MetricComparison.LESS
				compareTo = build {
					buildRule = lastSuccessful()
				}
			}
		}

		dependencies {
			snapshot(BuildDockerImage) {
				onDependencyFailure = FailureAction.FAIL_TO_START
			}
		}
	}
}

fun playwrightPrBuildType( targetDevice: String, buildUuid: String ): BuildType {
	return BuildType {
		id("Calypso_E2E_Playwright_$targetDevice")
		uuid = buildUuid
		name = "Playwright E2E Tests ($targetDevice)"
		description = "Runs Calypso e2e tests as $targetDevice using Playwright"

		artifactRules = """
			reports => reports
			logs.tgz => logs.tgz
			screenshots => screenshots
		""".trimIndent()

		vcs {
			root(Settings.WpCalypso)
			cleanCheckout = true
		}

		steps {
			bashNodeScript {
				name = "Prepare environment"
				scriptContent = """
					export NODE_ENV="test"
					export PLAYWRIGHT_BROWSERS_PATH=0

					# Install modules
					${_self.yarn_install_cmd}

					# Build packages
					yarn workspace @automattic/calypso-e2e build
				"""
				dockerImage = "%docker_image_e2e%"
			}
			bashNodeScript {
				name = "Run e2e tests ($targetDevice)"
				scriptContent = """
					shopt -s globstar
					set -x

					chmod +x ./bin/get-calypso-live-url.sh
					URL=${'$'}(./bin/get-calypso-live-url.sh ${BuildDockerImage.depParamRefs.buildNumber})
					if [[ ${'$'}? -ne 0 ]]; then
						// Command failed. URL contains stderr
						echo ${'$'}URL
						exit 1
					fi

					cd test/e2e
					mkdir temp

					export LIVEBRANCHES=true
					export NODE_CONFIG_ENV=test
					export PLAYWRIGHT_BROWSERS_PATH=0
					export TEAMCITY_VERSION=2021

					# Decrypt config
					openssl aes-256-cbc -md sha1 -d -in ./config/encrypted.enc -out ./config/local-test.json -k "%CONFIG_E2E_ENCRYPTION_KEY%"

					# Run the test
					export TARGET_DEVICE=$targetDevice
					export LOCALE=en
					export NODE_CONFIG="{\"calypsoBaseURL\":\"${'$'}{URL%/}\"}"
					export DEBUG=pw:api

					xvfb-run yarn jest --reporters=jest-teamcity --reporters=default --maxWorkers=%E2E_WORKERS% --group=calypso-pr
				""".trimIndent()
				dockerImage = "%docker_image_e2e%"
			}
			bashNodeScript {
				name = "Collect results"
				executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
				scriptContent = """
					set -x

					mkdir -p screenshots
					find test/e2e/results -type f -path '*/screenshots/*' -print0 | xargs -r -0 mv -t screenshots

					mkdir -p logs
					find test/e2e/results -name '*.log' -print0 | xargs -r -0 tar cvfz logs.tgz
				""".trimIndent()
				dockerImage = "%docker_image_e2e%"
			}
		}

		features {
			perfmon {
			}
			pullRequests {
				vcsRootExtId = "${Settings.WpCalypso.id}"
				provider = github {
					authType = token {
						token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
					}
					filterAuthorRole = PullRequests.GitHubRoleFilter.EVERYBODY
				}
			}
			commitStatusPublisher {
				vcsRootExtId = "${Settings.WpCalypso.id}"
				publisher = github {
					githubUrl = "https://api.github.com"
					authType = personalToken {
						token = "credentialsJSON:57e22787-e451-48ed-9fea-b9bf30775b36"
					}
				}
			}
		}

		triggers {
			vcs {
				branchFilter = """
					+:*
					-:pull*
				""".trimIndent()
			}
		}

		failureConditions {
			executionTimeoutMin = 20
		}

		dependencies {
			snapshot(BuildDockerImage) {
				onDependencyFailure = FailureAction.FAIL_TO_START
			}
		}
	}
}

object PreReleaseE2ETests : BuildType({
	id("Calypso_E2E_Pre_Release")
	uuid = "9c2f634f-6582-4245-bb77-fb97d9f16533"
	name = "Pre-Release E2E Tests"
	description = "Runs a pre-release suite of E2E tests against trunk on staging, intended to be run after PR merge, but before deployment to production."

	artifactRules = """
		reports => reports
		logs.tgz => logs.tgz
		screenshots => screenshots
	""".trimIndent()

	vcs {
		root(Settings.WpCalypso)
		cleanCheckout = true
	}

	steps {
		bashNodeScript {
			name = "Prepare environment"
			scriptContent = """
				export NODE_ENV="test"
				export PLAYWRIGHT_BROWSERS_PATH=0

				# Install modules
				${_self.yarn_install_cmd}

				# Build packages
				yarn workspace @automattic/calypso-e2e build
			"""
			dockerImage = "%docker_image_e2e%"
		}
		bashNodeScript {
			name = "Run pre-release e2e tests"
			scriptContent = """
				shopt -s globstar
				set -x

				cd test/e2e
				mkdir temp

				export URL="https://wpcalypso.wordpress.com"

				export NODE_CONFIG_ENV=test
				export PLAYWRIGHT_BROWSERS_PATH=0
				export TEAMCITY_VERSION=2021
				export TARGET_DEVICE=desktop
				export LOCALE=en
				export NODE_CONFIG="{\"calypsoBaseURL\":\"${'$'}{URL%/}\"}"
				export DEBUG=pw:api

				# Decrypt config
				openssl aes-256-cbc -md sha1 -d -in ./config/encrypted.enc -out ./config/local-test.json -k "%CONFIG_E2E_ENCRYPTION_KEY%"

				xvfb-run yarn jest --reporters=jest-teamcity --reporters=default --maxWorkers=%E2E_WORKERS% --group=calypso-release
			""".trimIndent()
			dockerImage = "%docker_image_e2e%"
		}
		bashNodeScript {
			name = "Collect results"
			executionMode = BuildStep.ExecutionMode.RUN_ON_FAILURE
			scriptContent = """
				set -x

				mkdir -p screenshots
				find test/e2e/results -type f -path '*/screenshots/*' -print0 | xargs -r -0 mv -t screenshots

				mkdir -p logs
				find test/e2e/results -name '*.log' -print0 | xargs -r -0 tar cvfz logs.tgz
			""".trimIndent()
			dockerImage = "%docker_image_e2e%"
		}
	}

	features {
		perfmon {
		}

		notifications {
			notifierSettings = slackNotifier {
				connection = "PROJECT_EXT_11"
				sendTo = "#e2eflowtesting-notif"
				messageFormat = simpleMessageFormat()
			}
			buildFailedToStart = true
			buildFailed = true
			buildFinishedSuccessfully = true
			buildProbablyHanging = true
		}
	}

	triggers {}

	failureConditions {
		executionTimeoutMin = 20
	}
})
