import {
	defer,
	difference,
	filter,
	find,
	flatMap,
	forEach,
	includes,
	isEmpty,
	keys,
	pick,
	reject,
	reduce,
} from 'lodash';
import page from 'page';
import { Store, Unsubscribe as ReduxUnsubscribe } from 'redux';
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import wpcom from 'calypso/lib/wp';
import flows from 'calypso/signup/config/flows';
import untypedSteps from 'calypso/signup/config/steps';
import { getStepUrl } from 'calypso/signup/utils';
import { isUserLoggedIn } from 'calypso/state/current-user/selectors';
import {
	resetSignup,
	updateDependencies,
	removeSiteSlugDependency,
} from 'calypso/state/signup/actions';
import { getSignupDependencyStore } from 'calypso/state/signup/dependency-store/selectors';
import { getCurrentFlowName, getPreviousFlowName } from 'calypso/state/signup/flow/selectors';
import {
	completeSignupStep,
	invalidateStep,
	processStep,
} from 'calypso/state/signup/progress/actions';
import { ProgressState } from 'calypso/state/signup/progress/schema';
import { getSignupProgress } from 'calypso/state/signup/progress/selectors';

interface Dependencies {
	[ other: string ]: string[];
}

interface Flow {
	destination: string | ( ( dependencies: Dependencies ) => string );
	providesDependenciesInQuery?: string[];
	steps: string[];
}

interface Step {
	apiRequestFunction?: (
		callback: ( errors: Record< string, string >[], providedDependencies: Dependencies ) => void,
		dependenciesFound: Dependencies,
		step: Step,
		reduxStore: Store
	) => void;
	delayApiRequestUntilComplete?: boolean;
	dependencies?: string[];
	providedDependencies?: string[];
	providesDependencies?: string[];
	optionalDependencies?: string[];
	providesToken?: boolean;
	stepName: string;
	allowUnauthenticated?: boolean;
}

const steps: Record< string, Step > = untypedSteps;

function progressStoreListener(
	reduxStore: Store,
	callback: ( nextState: ProgressState ) => void
) {
	let prevState = getSignupProgress( reduxStore.getState() );
	return () => {
		const nextState = getSignupProgress( reduxStore.getState() );
		if ( nextState !== prevState ) {
			prevState = nextState;
			callback( nextState );
		}
	};
}

type OnCompleteCallback = ( dependencies: Dependencies, destination: string ) => void;

interface SignupFlowControllerOptions {
	flowName: string;
	providedDependencies: Dependencies;
	reduxStore: Store;
	onComplete: OnCompleteCallback;
}

export default class SignupFlowController {
	_flow: Flow;
	_flowName: string;
	_onComplete: OnCompleteCallback;
	_processingSteps = new Set< string >();
	_reduxStore: Store;
	_unsubscribeStore?: ReduxUnsubscribe;

	constructor( options: SignupFlowControllerOptions ) {
		const userLoggedIn = isUserLoggedIn( options.reduxStore.getState() );
		this._flow = flows.getFlow( options.flowName, userLoggedIn );
		this._flowName = options.flowName;
		this._onComplete = options.onComplete;
		this._reduxStore = options.reduxStore;

		this.changeFlowName( options.flowName );

		try {
			this._assertFlowHasValidDependencies();
		} catch ( ex ) {
			if ( this._flowName !== flows.defaultFlowName ) {
				// redirect to the default signup flow, hopefully it will be valid
				page( getStepUrl() );
				return;
			}
			throw ex;
		}

		this._unsubscribeStore = this._reduxStore.subscribe(
			progressStoreListener( this._reduxStore, this._process.bind( this ) )
		);

		this._resetStoresIfProcessing(); // reset the stores if the cached progress contained a processing step
		this._resetStoresIfUserHasLoggedIn(); // reset the stores if user has newly authenticated
		this._resetSiteSlugIfUserEnteredAnotherFlow(); // reset the site slug if user entered another flow

		if ( this._flow.providesDependenciesInQuery || options.providedDependencies ) {
			this._assertFlowProvidedDependenciesFromConfig( options.providedDependencies );
			this._reduxStore.dispatch( updateDependencies( options.providedDependencies ) );
		} else {
			// TODO: synces deps from progress to dep store: are they ever out of sync?
			const storedDependencies = this._getStoredDependencies();

			if ( ! isEmpty( storedDependencies ) ) {
				this._reduxStore.dispatch( updateDependencies( storedDependencies ) );
			}
		}
	}

	_resetStoresIfProcessing() {
		if ( find( getSignupProgress( this._reduxStore.getState() ), { status: 'processing' } ) ) {
			this.reset();
		}
	}

	_resetStoresIfUserHasLoggedIn() {
		if (
			isUserLoggedIn( this._reduxStore.getState() ) &&
			find( getSignupProgress( this._reduxStore.getState() ), { stepName: 'user' } )
		) {
			this.reset();
		}
	}

	_resetSiteSlugIfUserEnteredAnotherFlow() {
		// If siteSlug exists when when entering another flow,
		// removing the siteSlug prevents plans from being added to the wrong cart.
		const dependencies = getSignupDependencyStore( this._reduxStore.getState() );
		if ( ! dependencies.siteSlug ) {
			return;
		}

		// If we are entering from one flow to another, we should remove the siteSlug stored by previous flow if the following conditions are met:
		// - the previous flow does not contain a step that provides the siteSlug dependency
		// - the current flow contains a step that provides the siteSlug dependency
		const previousFlowName = getPreviousFlowName( this._reduxStore.getState() );
		const currentFlowName = getCurrentFlowName( this._reduxStore.getState() );

		const hasStepThatProvidesSiteSlug = ( flowName: string ) => {
			let foundStepThatProvidesSiteSlug = false;
			const userLoggedIn = isUserLoggedIn( this._reduxStore.getState() );
			forEach( pick( steps, flows.getFlow( flowName, userLoggedIn ).steps ), ( step ) => {
				if ( ( step.providesDependencies || [] ).indexOf( 'siteSlug' ) > -1 ) {
					foundStepThatProvidesSiteSlug = true;
					return false;
				}
			} );
			return foundStepThatProvidesSiteSlug;
		};

		if ( previousFlowName !== currentFlowName ) {
			if (
				! hasStepThatProvidesSiteSlug( previousFlowName ) &&
				hasStepThatProvidesSiteSlug( currentFlowName )
			) {
				this._reduxStore.dispatch( removeSiteSlugDependency() );
			}
		}
	}

	_assertFlowProvidedDependenciesFromConfig( providedDependencies: Dependencies ) {
		const dependencyDiff = difference(
			this._flow.providesDependenciesInQuery,
			keys( providedDependencies )
		);
		if ( dependencyDiff.length > 0 ) {
			throw new Error(
				this._flowName +
					' did not provide the query dependencies [' +
					dependencyDiff +
					'] it is configured to.'
			);
		}
	}

	_assertFlowHasValidDependencies() {
		forEach( pick( steps, this._flow.steps ), ( step ) => {
			if ( ! step.dependencies ) {
				return;
			}

			const dependenciesFound = keys(
				pick( getSignupDependencyStore( this._reduxStore.getState() ), step.dependencies )
			);
			const dependenciesNotProvided = difference(
				step.dependencies,
				dependenciesFound,
				this._getFlowProvidesDependencies()
			);

			if ( dependenciesNotProvided.length > 0 ) {
				throw new Error(
					'The ' +
						step.stepName +
						' step requires dependencies [' +
						dependenciesNotProvided +
						'] which ' +
						'are not provided in the ' +
						this._flowName +
						' flow and are not already present in the store.'
				);
			}
		} );
	}

	_assertFlowProvidedRequiredDependencies() {
		const storedDependencies = keys( getSignupDependencyStore( this._reduxStore.getState() ) );

		forEach( pick( steps, this._flow.steps ), ( step ) => {
			if ( ! step.providesDependencies ) {
				return;
			}

			const optionalDependencies = step.optionalDependencies || [];

			const dependenciesNotProvided = difference(
				step.providesDependencies,
				optionalDependencies,
				storedDependencies
			);

			if ( dependenciesNotProvided.length > 0 ) {
				throw new Error(
					'The dependencies [' +
						dependenciesNotProvided +
						'] were listed as provided by the ' +
						step.stepName +
						' step but were not provided by it [ current flow: ' +
						this._flowName +
						' ].'
				);
			}
		} );
	}

	_canMakeAuthenticatedRequests() {
		return wpcom.isTokenLoaded() || isUserLoggedIn( this._reduxStore.getState() );
	}

	/**
	 * Returns a list of the dependencies provided in the flow configuration.
	 *
	 * @returns {Array} a list of dependency names
	 */
	_getFlowProvidesDependencies() {
		return flatMap(
			this._flow.steps,
			( stepName ) => ( steps && steps[ stepName ] && steps[ stepName ].providesDependencies ) || []
		).concat( this._flow.providesDependenciesInQuery || [] );
	}

	_process() {
		const currentSteps = this._flow.steps;
		const signupProgress = filter( getSignupProgress( this._reduxStore.getState() ), ( step ) =>
			includes( currentSteps, step.stepName )
		);
		const pendingSteps = filter( signupProgress, { status: 'pending' } );
		const completedSteps = filter( signupProgress, { status: 'completed' } );
		const dependencies = getSignupDependencyStore( this._reduxStore.getState() );

		if ( dependencies.bearer_token && ! wpcom.isTokenLoaded() ) {
			wpcom.loadToken( dependencies.bearer_token );
		}

		for ( const pendingStep of pendingSteps ) {
			this._processStep( pendingStep );
		}

		if ( completedSteps.length === currentSteps.length && undefined !== this._onComplete ) {
			this._assertFlowProvidedRequiredDependencies();
			// deferred to ensure that the onComplete function is called after the stores have
			// emitted their final change events.
			defer( () => this._onComplete( dependencies, this._destination( dependencies ) ) );
		}
	}

	_canProcessStep( step: Step ) {
		const { dependencies = [], providesToken } = steps[ step.stepName ];
		const dependenciesFound = this._findDependencies( step.stepName, 'dependencies' );
		const dependenciesSatisfied = dependencies.length === keys( dependenciesFound ).length;
		const currentSteps = this._flow.steps;
		const signupProgress = filter(
			getSignupProgress( this._reduxStore.getState() ),
			( { stepName } ) => includes( currentSteps, stepName )
		);
		const allStepsSubmitted =
			reject( signupProgress, { status: 'in-progress' } ).length === currentSteps.length;
		const allowUnauthenticated =
			getSignupDependencyStore( this._reduxStore.getState() )?.allowUnauthenticated ?? false;

		return (
			dependenciesSatisfied &&
			( allowUnauthenticated || providesToken || this._canMakeAuthenticatedRequests() ) &&
			( ! steps[ step.stepName ].delayApiRequestUntilComplete || allStepsSubmitted )
		);
	}

	_processStep( step: Step ) {
		if ( this._processingSteps.has( step.stepName ) || ! this._canProcessStep( step ) ) {
			return;
		}

		this._processingSteps.add( step.stepName );

		const dependenciesFound = this._findDependencies( step.stepName, 'dependencies' );
		const optionalDependenciesFound = this._findDependencies(
			step.stepName,
			'optionalDependencies'
		);

		// deferred because a step can be processed as soon as it is submitted
		defer( () => {
			this._reduxStore.dispatch( processStep( step ) );
		} );

		const apiFunction = steps[ step.stepName ].apiRequestFunction;
		if ( ! apiFunction ) {
			return;
		}

		apiFunction(
			( errors, providedDependencies ) => {
				this._processingSteps.delete( step.stepName );

				if ( errors ) {
					this._reduxStore.dispatch( invalidateStep( step, errors ) );
				} else {
					recordTracksEvent( 'calypso_signup_actions_complete_step', {
						step: step.stepName,
						flow: this._flowName,
					} );
					this._reduxStore.dispatch( completeSignupStep( step, providedDependencies ) );
				}
			},
			{ ...dependenciesFound, ...optionalDependenciesFound },
			step,
			this._reduxStore
		);
	}

	_findDependencies( stepName: string, dependencyKey = 'dependencies' ): Record< string, unknown > {
		const dependencyStore = getSignupDependencyStore( this._reduxStore.getState() );
		const stepConfig = steps[ stepName ];
		if ( ! stepConfig || ! stepConfig[ dependencyKey ] ) {
			return {};
		}

		return pick( dependencyStore, stepConfig[ dependencyKey ] );
	}

	_destination( dependencies: Dependencies ): string {
		if ( typeof this._flow.destination === 'function' ) {
			return this._flow.destination( dependencies );
		}

		return this._flow.destination;
	}

	_getStoredDependencies() {
		const requiredDependencies = flatMap(
			this._flow.steps,
			( stepName ) => ( steps && steps[ stepName ] && steps[ stepName ].providesDependencies ) || []
		);

		return reduce(
			getSignupProgress( this._reduxStore.getState() ),
			( current, step ) => ( {
				...current,
				...pick( step.providedDependencies, requiredDependencies ),
			} ),
			{}
		);
	}

	reset() {
		this._reduxStore.dispatch( resetSignup() );
	}

	cleanup() {
		this._unsubscribeStore && this._unsubscribeStore();
	}

	changeFlowName( flowName: string ) {
		const userLoggedIn = isUserLoggedIn( this._reduxStore.getState() );
		flows.resetExcludedSteps();
		this._flowName = flowName;
		this._flow = flows.getFlow( flowName, userLoggedIn );
	}

	getDestination() {
		const dependencies = getSignupDependencyStore( this._reduxStore.getState() );

		return this._destination( dependencies );
	}
}
