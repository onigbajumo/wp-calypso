import { appendFile, mkdir, mkdtemp } from 'fs/promises';
import path from 'path';
import config from 'config';
import { getState } from 'expect';
import { devices } from 'playwright';
import { getVideoDir } from './media-helper';
import type { LaunchOptions } from './browser-manager';
import type { TargetDevice } from './types';
import type { BrowserContextOptions, ViewportSize } from 'playwright';

export type LocaleCode = `${ string }${ string }`;

/**
 * Returns the target screen size for tests to run against.
 *
 * If the environment variable TARGET_DEVICE is set, this will override all configuration
 * values. Otherwise, the default path contained in the configuration file is returned.
 *
 * @returns {TargetDevice} Target screen size.
 */
export function getTargetDeviceName(): TargetDevice {
	return (
		process.env.TARGET_DEVICE || config.get( 'viewportName' )!
	).toLowerCase() as TargetDevice;
}

/**
 * Returns the locale under test.
 *
 * If the environment variable LOCALE is set, this will override all configuration
 * values. Otherwise, the default path contained in the configuration file is returned.
 *
 * @returns {LocaleCode} Target locale code.
 */
export function getLocale(): LocaleCode {
	return ( process.env.LOCALE || config.get( 'locale' )! ).toLowerCase() as LocaleCode;
}

/**
 * Returns launch configuration of a device mapping to the target device.
 *
 * @param {TargetDevice} name Name of the target device.
 * @returns {BrowserContextOptions} Launch configuration of the device.
 */
export function getDevice( name: TargetDevice ): BrowserContextOptions {
	if ( name === 'mobile' ) {
		return devices[ 'Pixel 4a (5G)' ];
	}
	if ( name === 'desktop' ) {
		return devices[ 'Desktop Chrome HiDPI' ];
	}
	throw new Error( 'Unknown target device.' );
}

/**
 * Returns whether the test should be run headlessly.
 *
 * This method will return true if either the environment variable is set, or the
 * configuration file contains a top-level entry of `headless`.
 *
 * @returns {boolean} Whether the test should be run headlessly.
 */
export function getHeadless(): boolean {
	return process.env.HEADLESS === 'true' || config.has( 'headless' );
}

/**
 * Builds a basic launch configuration that match the target device specified by environment variables.
 *
 * Generated launch configuration will be based on Playwright's pre-defined set of devices,
 * however with certain customizations.
 *
 * @param {string} chromeVersion Chrome version to be used as part of user agent string.
 * @returns {BrowserContextOptions} Customized launch configuration for the target.
 */
export function getLaunchConfiguration( chromeVersion: string ): BrowserContextOptions {
	const videoDir = getVideoDir();
	const userAgent = `user-agent=Mozilla/5.0 (wp-e2e-tests) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ chromeVersion } Safari/537.36`;

	// Obtain the target device. Currently supported are devices are listed in types.
	const targetDevice = getTargetDeviceName();
	// Get Playwright's pre-defined device that maps to the target device.
	const config = getDevice( targetDevice );

	// Overwrite predefined user agent string with our custom one.
	config.userAgent = userAgent;
	// Explicitly resize captured video resolution to the viewport size.
	config.recordVideo = { dir: videoDir, size: config.viewport as ViewportSize };
	return config;
}

/**
 * Returns boolean indicating whether this test run should target a Gutenberg Edge user and site.
 *
 * @returns {boolean} True if should target Gutenberg edge. False otherwise.
 */
export function targetGutenbergEdge(): boolean {
	return !! process.env.GUTENBERG_EDGE;
}

/**
 * Returns the default Logger configuration.
 *
 * The default Logger configuration has the following:
 * 	- level: pw:api (verbose API logs)
 * 	- name, severity, message
 * 	- file name: playwright.log
 *
 * @returns {LaunchOptions} Logger configuration.
 */
export async function getDefaultLoggerConfiguration(): Promise< LaunchOptions > {
	return {
		logger: {
			log: async ( name: string, severity: string, message: string ) => {
				await appendFile(
					path.join( await getArtifactDir(), 'playwright.log' ),
					`${ new Date().toISOString() } ${ process.pid } ${ name } ${ severity }: ${ message }\n`
				);
			},
			// Default to verbose Playwright API logs.
			isEnabled: ( name: string ) => name === 'api',
		},
	};
}

/**
 * Returns the artifact directory where logs, screenshots and video recordings are stored.
 *
 * @returns {Promise<string>} Path to the artifdact directory.
 */
export async function getArtifactDir(): Promise< string > {
	const { testPath } = getState() as { testPath: string };
	const sanitizedTestFilename = path.basename( testPath, path.extname( testPath ) );
	const resultsPath = path.join( process.cwd(), 'results' );
	await mkdir( resultsPath, { recursive: true } );
	return await mkdtemp( path.join( resultsPath, sanitizedTestFilename + '-' ) );
}
