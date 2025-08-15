import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { HONEYCOMB_CONFIG } from '../../config/honeycomb.config';

// Lightweight context shape used by the rest of the app
interface HoneycombContextType {
	client: any;
	isAuthenticated: boolean;
	authenticate: () => Promise<void>;
	userPublicKey: string | null;
	projectAddress: string | null;
	profileAddress: string | null;
	initializeProject: () => Promise<void>;
	createUserProfile: () => Promise<void>;
}

// Safe defaults
const defaultContext: HoneycombContextType = {
	client: {},
	isAuthenticated: false,
	authenticate: async () => {},
	userPublicKey: null,
	projectAddress: null,
	profileAddress: null,
	initializeProject: async () => {},
	createUserProfile: async () => {},
};

export const HoneycombContext = createContext<HoneycombContextType>(defaultContext);

export const useHoneycomb = () => {
	const ctx = useContext(HoneycombContext);
	return ctx;
};

export const HoneycombProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const wallet = useWallet();
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [userPublicKey, setUserPublicKey] = useState<string | null>(null);
	const [projectAddress, setProjectAddress] = useState<string | null>("dev-project");
	const [profileAddress, setProfileAddress] = useState<string | null>(null);

	// Attempt to create a real Edge Client at runtime; safely fall back to stub
	const [client, setClient] = useState<any>({});

	useEffect(() => {
		let disposed = false;
		(async () => {
			try {
				// Dynamic import to avoid type/packaging issues during dev
				const edge = await import('@honeycomb-protocol/edge-client');
				const createEdgeClient = (edge as any)?.createEdgeClient || (edge as any)?.default;
				if (typeof createEdgeClient === 'function') {
					const network = HONEYCOMB_CONFIG.CURRENT_NETWORK as keyof typeof HONEYCOMB_CONFIG.RPC_ENDPOINTS;
					const rpc = (HONEYCOMB_CONFIG.RPC_ENDPOINTS as any)[network];
					const edgeUrl = (HONEYCOMB_CONFIG.EDGE_CLIENT_API_URLS as any)[network];
					const c = await createEdgeClient({ rpcEndpoint: rpc, edgeEndpoint: edgeUrl });
					if (!disposed) setClient(c);
					return;
				}
			} catch (err) {
				console.warn('Edge client unavailable, using local stub:', err);
			}
			// Fallback stub so app remains functional in dev/offline
			if (!disposed) setClient({
				authRequest: async () => ({ message: 'Sign to authenticate' }),
				authConfirm: async () => ({ accessToken: 'local-dev-token', user: { address: userPublicKey } }),
				createCreateProjectTransaction: async () => ({ project: 'dev-project', tx: {} }),
				createCreateProfilesTreeTransaction: async () => ({ tx: {} }),
				createNewUserWithProfileTransaction: async () => ({ tx: {} }),
				findProfiles: async () => ({ profile: [{ address: userPublicKey }] }),
			});
		})();
		return () => { disposed = true; };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const authenticate = async () => {
		if (!wallet?.connected || !wallet.publicKey) {
			return;
		}
		setUserPublicKey(wallet.publicKey.toBase58());
		setIsAuthenticated(true);
	};

	const initializeProject = async () => {
		try {
			// In a real client, you'd create/find the project and profile tree here
			setProjectAddress(prev => prev || 'dev-project');
		} catch (e) {
			console.warn('initializeProject stubbed:', e);
			setProjectAddress(prev => prev || 'dev-project');
		}
	};

	const createUserProfile = async () => {
		try {
			if (userPublicKey) setProfileAddress(userPublicKey);
		} catch (e) {
			console.warn('createUserProfile stubbed:', e);
			if (userPublicKey) setProfileAddress(userPublicKey);
		}
	};

	useEffect(() => {
		if (wallet?.connected && wallet.publicKey && !isAuthenticated) {
			setUserPublicKey(wallet.publicKey.toBase58());
		}
	}, [wallet?.connected, wallet?.publicKey, isAuthenticated]);

	const contextValue: HoneycombContextType = useMemo(() => ({
		client,
		isAuthenticated,
		authenticate,
		userPublicKey,
		projectAddress,
		profileAddress,
		initializeProject,
		createUserProfile,
	}), [client, isAuthenticated, userPublicKey, projectAddress, profileAddress]);

	return (
		<HoneycombContext.Provider value={contextValue}>
			{children}
		</HoneycombContext.Provider>
	);
};