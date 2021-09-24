import { SelectorProduct, SelectorProductFeaturesItem } from '../types';

// Right now this storage upgrade page is the only place
// where we're adding stars to differentiating features,
// but that could change. I isolated the logic for it in this file,
// in case we need to generalize it later.

const DIFFERENTIATING_FEATURES: string[] = [
	// TODO
];

const withDifferentiators = ( products: SelectorProduct[] ): SelectorProduct[] => {
	// Create safe copies of each product and its feature list,
	// only adding `isDifferentiator: true` if a feature is in
	// the differentiating features list.
	return products.map( ( p: SelectorProduct ) => ( {
		...p,
		features: {
			...p.features,
			items: ( p.features.items as SelectorProductFeaturesItem[] ).map( ( f ) => ( {
				...f,
				isDifferentiator: DIFFERENTIATING_FEATURES.includes( f.slug ),
			} ) ),
		},
	} ) );
};

export default withDifferentiators;
