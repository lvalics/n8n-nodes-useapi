import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
	NodeConnectionType,
	INodeInputConfiguration,
	INodeOutputConfiguration
} from 'n8n-workflow';
import { IMAGES_CREATE_OPERATION } from '../minimax/ImagesCreateDescription';
import { IMAGES_RETRIEVE_OPERATION } from '../minimax/ImagesRetrieveDescription';
import { runwayFields, runwayOperations } from '../runwayml/RunwayDescription';
import { gen3TurboFields } from '../runwayml/Gen3TurboDescription';
import { textToImageFields } from '../runwayml/TextToImageDescription';
import { lipSyncFields } from '../runwayml/LipSyncDescription';
import { videoToVideoFields } from '../runwayml/VideoToVideoDescription';
import { accountCreateFields as runwayAccountCreateFields } from '../runwayml/AccountCreateDescription';
import { minimaxFields, minimaxOperations } from '../minimax/MinimaxDescription';
import { videosCreateFields } from '../minimax/VideosCreateDescription';
import { accountCreateFields } from '../minimax/AccountCreateDescription';
import { videosRetrieveFields } from '../minimax/VideosRetrieveDescription';
import { filesCreateFields } from '../minimax/FilesCreateDescription';
import { filesListFields } from '../minimax/FilesListDescription';
import { imagineFields } from '../midjourney/ImagineDescription';
import { getJobFields } from '../midjourney/GetJobDescription';
import { buttonFields } from '../midjourney/ButtonDescription';
import { midjourneyOperations } from '../midjourney/MidjourneyDescription';

// Define base URL constants
const BASE_URL_V1 = 'https://api.useapi.net/v1'; // For API operations (RunwayML assets, etc.)
const BASE_URL_V2 = 'https://api.useapi.net/v2'; // For credential management and verification
// This constant is used in credentials/UseApiApi.credentials.ts
void BASE_URL_V2; // Prevent "unused variable" TypeScript error

export class UseApi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'UseAPI',
		name: 'useApi',
		icon: 'file:useapi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with RunwayML through UseAPI',
		defaults: {
			name: 'UseAPI',
		},
		inputs: ['main'] as (NodeConnectionType | INodeInputConfiguration)[],
		outputs: ['main'] as (NodeConnectionType | INodeOutputConfiguration)[],
		credentials: [
			{
				name: 'useApiApi',
				required: true,
				displayOptions: {
					show: {
						resource: ['runway'],
					},
				},
			},
			{
				name: 'useApiMinimax',
				required: true,
				displayOptions: {
					show: {
						resource: ['minimax'],
					},
				},
			},
			{
				name: 'useApiMidjourney',
				required: true,
				displayOptions: {
					show: {
						resource: ['midjourney'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Runway',
						value: 'runway',
					},
					{
						name: 'Minimax',
						value: 'minimax',
					},
					{
						name: 'Midjourney',
						value: 'midjourney',
					},
				],
				default: 'runway',
			},

			...runwayOperations,
			...runwayFields,
			...gen3TurboFields,
			...textToImageFields,
			...lipSyncFields,
			...videoToVideoFields,
			...runwayAccountCreateFields,
			...minimaxOperations,
			...minimaxFields,
			...videosCreateFields,
			...accountCreateFields,
			...videosRetrieveFields,
			...filesCreateFields,
			...filesListFields,
			...imagineFields,
			...getJobFields,
			...buttonFields,
			...midjourneyOperations,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				let responseData;

				if (resource === 'runway') {
					if (operation === 'getAssets') {
						// Get required parameters
						const offset = this.getNodeParameter('offset', i) as number;
						const limit = this.getNodeParameter('limit', i) as number;

						// Get optional parameters
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
							mediaType?: string;
							assetId?: string;
							filterType?: string;
							filterValue?: string;
						};

						// Build the query string directly
						let queryString = `?offset=${offset}&limit=${limit}`;

						if (additionalFields.mediaType) queryString += `&mediaType=${encodeURIComponent(additionalFields.mediaType)}`;

						// Construct URL exactly like the working example
						const fullUrl = `${BASE_URL_V1}/runwayml/assets/${queryString}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// console.log('Making API request to:', fullUrl);

						// Make request with only the Authorization header
						responseData = await this.helpers.request({
							method: 'GET',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});

						// Filter results if specified
						if (responseData && Array.isArray(responseData.assets)) {
							const filterType = this.getNodeParameter('filterType', i, 'none') as string;
							if (filterType !== 'none') {
								const filterValue = this.getNodeParameter('filterValue', i, '') as string;
								if (filterValue) {
									responseData.assets = responseData.assets.filter((asset: any) => {
										// Special handling for asset ID since it might need exact matching
										if (filterType === 'id') {
											return String(asset.id) === filterValue;
										}

										// For other fields, allow partial matching
										return String(asset[filterType])?.toLowerCase().includes(filterValue.toLowerCase());
									});
								}
							}
						}

						// console.log('Response received');

					} else if (operation === 'getAsset') {
						const assetId = this.getNodeParameter('assetId', i) as string;

						// Construct URL with BASE_URL_V1
						const fullUrl = `${BASE_URL_V1}/runwayml/assets/${assetId}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// console.log('Making API request to:', fullUrl);

						// Make request with only the Authorization header
						responseData = await this.helpers.request({
							method: 'GET',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});

						// console.log('Response received');
					} else if (operation === 'deleteAsset') {
						const assetId = this.getNodeParameter('assetId', i) as string;
						const confirmation = this.getNodeParameter('confirmation', i) as boolean;

						if (!confirmation) {
							throw new NodeOperationError(this.getNode(), 'Operation cancelled: You must confirm the deletion by checking the confirmation checkbox.', { itemIndex: i });
						}

						// Construct URL with BASE_URL_V1
						const fullUrl = `${BASE_URL_V1}/runwayml/assets/${assetId}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// console.log('Making API delete request to:', fullUrl);

						// Make request with DELETE method
						responseData = await this.helpers.request({
							method: 'DELETE',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});

						// console.log('Delete response received');
					} else if (operation === 'uploadAsset') {
						const name = this.getNodeParameter('name', i) as string;
						const inputType = this.getNodeParameter('inputType', i) as string;

						// Get additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
							duration?: number;
							width?: number;
							height?: number;
						};

						// Construct URL with query parameters
						let queryUrl = `${BASE_URL_V1}/runwayml/assets/?name=${encodeURIComponent(name)}`;

						// Add optional parameters if they exist
						if (additionalFields.duration) queryUrl += `&duration=${additionalFields.duration}`;
						if (additionalFields.width) queryUrl += `&width=${additionalFields.width}`;
						if (additionalFields.height) queryUrl += `&height=${additionalFields.height}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						let binaryData;
						let contentType;

						if (inputType === 'binaryData') {
							// Handle binary data upload
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

							if (!items[i].binary) {
								throw new NodeApiError(this.getNode(), { message: 'No binary data found' });
							}

							// Use type assertion to tell TypeScript that binary exists and has the correct type
							const binary = items[i].binary!;

							// Use a safer property access method that TypeScript understands
							if (!(binaryPropertyName in binary)) {
								throw new NodeApiError(this.getNode(), { message: `No binary data found in property "${binaryPropertyName}"` });
							}

							// Now TypeScript knows this is safe
							const binaryProperty = binary[binaryPropertyName];
							binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
							contentType = binaryProperty.mimeType;
						} else if (inputType === 'url') {
							// Handle URL upload
							const url = this.getNodeParameter('url', i) as string;

							// Download the file from the URL
							const response = await this.helpers.request({
								method: 'GET',
								url,
								encoding: null, // Get the response as a Buffer
							});

							binaryData = response;

							// Try to determine content type from the URL
							const fileExtension = url.split('.').pop()?.toLowerCase();

							if (fileExtension) {
								// Map common extensions to content types based on docs
								const contentTypeMap: { [key: string]: string } = {
									'png': 'image/png',
									'jpg': 'image/jpeg',
									'jpeg': 'image/jpeg',
									'gif': 'image/gif',
									'webp': 'image/webp',
									'mpo': 'image/mpo',
									'mp4': 'video/mp4',
									'mov': 'video/quicktime',
									'3gp': 'video/3gpp',
									'mkv': 'video/x-matroska',
									'flv': 'video/x-flv',
									'mpeg': 'video/mpeg',
									'ts': 'video/MP2T',
									'avi': 'video/x-msvideo',
									'mjpeg': 'video/x-motion-jpeg',
									'webm': 'video/webm',
									'ogv': 'video/ogg',
									'wav': 'audio/wav',
									'mp3': 'audio/mpeg',
									'flac': 'audio/flac',
									'ogg': 'audio/ogg',
								};

								contentType = contentTypeMap[fileExtension] || 'application/octet-stream';
							} else {
								contentType = 'application/octet-stream'; // Default
							}
						}

						// Make the API request to upload the asset
						responseData = await this.helpers.request({
							method: 'POST',
							url: queryUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': contentType,
							},
							body: binaryData,
							json: true,
						});
					} else if (operation === 'gen3TurboCreate') {
						// Get parameters
						const firstImageAssetId = this.getNodeParameter('firstImage_assetId', i) as string;
						const imageInput = this.getNodeParameter('imageInput', i) as string;
						const textPrompt = this.getNodeParameter('text_prompt', i, '') as string;
						const aspectRatio = this.getNodeParameter('aspect_ratio', i) as string;
						const seconds = this.getNodeParameter('seconds', i) as number;
						const seed = this.getNodeParameter('seed', i, '') as string | number;

						// Get camera motion options
						const cameraMotionOptions = this.getNodeParameter('cameraMotionOptions', i, {}) as {
							static?: boolean;
							horizontal?: number;
							vertical?: number;
							zoom?: number;
							roll?: number;
							pan?: number;
							tilt?: number;
						};

						// Get additional settings
						const additionalSettings = this.getNodeParameter('additionalSettings', i, {}) as {
							exploreMode?: boolean;
							replyUrl?: string;
							replyRef?: string;
							maxJobs?: number;
						};

						// Build request body
						const requestBody: {[key: string]: any} = {
							firstImage_assetId: firstImageAssetId,
							text_prompt: textPrompt || undefined,
							aspect_ratio: aspectRatio,
							seconds: seconds,
						};

						// Add conditional parameters based on image input
						if (imageInput === 'firstAndLastImages' || imageInput === 'allImages') {
							requestBody.lastImage_assetId = this.getNodeParameter('lastImage_assetId', i, '') as string;
						}

						if (imageInput === 'allImages') {
							requestBody.middleImage_assetId = this.getNodeParameter('middleImage_assetId', i, '') as string;
						}

						// Add seed if provided
						if (seed !== '') {
							requestBody.seed = seed;
						}

						// Add camera motion parameters
						if (cameraMotionOptions.static) {
							requestBody.static = true;
						} else {
							if (cameraMotionOptions.horizontal !== undefined) requestBody.horizontal = cameraMotionOptions.horizontal;
							if (cameraMotionOptions.vertical !== undefined) requestBody.vertical = cameraMotionOptions.vertical;
							if (cameraMotionOptions.zoom !== undefined) requestBody.zoom = cameraMotionOptions.zoom;
							if (cameraMotionOptions.roll !== undefined) requestBody.roll = cameraMotionOptions.roll;
							if (cameraMotionOptions.pan !== undefined) requestBody.pan = cameraMotionOptions.pan;
							if (cameraMotionOptions.tilt !== undefined) requestBody.tilt = cameraMotionOptions.tilt;
						}

						// Add additional settings
						if (additionalSettings.exploreMode) requestBody.exploreMode = true;
						if (additionalSettings.replyUrl) requestBody.replyUrl = additionalSettings.replyUrl;
						if (additionalSettings.replyRef) requestBody.replyRef = additionalSettings.replyRef;
						if (additionalSettings.maxJobs) requestBody.maxJobs = additionalSettings.maxJobs;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make the API request to create the video
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V1}/runwayml/gen3turbo/create`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body: requestBody,
							json: true,
						});
					} else if (operation === 'getTasks') {
						// Get required parameters
						const offset = this.getNodeParameter('offset', i) as number;
						const limit = this.getNodeParameter('limit', i) as number;

						// Get optional parameters
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
							email?: string;
							statuses?: string;
						};

						// Build the query string
						let queryString = `?offset=${offset}&limit=${limit}`;

						if (additionalFields.email) queryString += `&email=${encodeURIComponent(additionalFields.email)}`;
						if (additionalFields.statuses) queryString += `&statuses=${encodeURIComponent(additionalFields.statuses)}`;

						// Construct URL
						const fullUrl = `${BASE_URL_V1}/runwayml/tasks/${queryString}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make request
						responseData = await this.helpers.request({
							method: 'GET',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'getTask') {
						const taskId = this.getNodeParameter('taskId', i) as string;

						// Construct URL
						const fullUrl = `${BASE_URL_V1}/runwayml/tasks/${taskId}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make request
						responseData = await this.helpers.request({
							method: 'GET',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'describeImage') {
						const imageAssetId = this.getNodeParameter('imageAssetId', i) as string;

						// Construct URL
						const fullUrl = `${BASE_URL_V1}/runwayml/frames/describe/${imageAssetId}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make request
						responseData = await this.helpers.request({
							method: 'GET',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'textToImage') {
						// Get required parameters
						const textPrompt = this.getNodeParameter('text_prompt', i) as string;
						const style = this.getNodeParameter('style', i) as string;
						const aspectRatio = this.getNodeParameter('aspect_ratio', i) as string;

						// Get additional options
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
							prompt_weight?: number;
							negative_prompt?: string;
							seed?: number;
						};

						// Build query parameters
						let queryUrl = `${BASE_URL_V1}/runwayml/text_to_image_preview/?text_prompt=${encodeURIComponent(textPrompt)}`;

						// Add style and aspect ratio
						queryUrl += `&style=${style}&aspect_ratio=${aspectRatio}`;

						// Add optional parameters if they exist
						if (additionalOptions.prompt_weight) queryUrl += `&prompt_weight=${additionalOptions.prompt_weight}`;
						if (additionalOptions.negative_prompt) queryUrl += `&negative_prompt=${encodeURIComponent(additionalOptions.negative_prompt)}`;
						if (additionalOptions.seed) queryUrl += `&seed=${additionalOptions.seed}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make the API request
						responseData = await this.helpers.request({
							method: 'GET',
							url: queryUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'lipSync') {
						// Get the input type
						const inputType = this.getNodeParameter('inputType', i) as string;

						// Prepare request body
						const requestBody: {[key: string]: any} = {};

						// Add parameters based on input type
						if (inputType === 'imageAudio' || inputType === 'imageVoiceText') {
							requestBody.image_assetId = this.getNodeParameter('image_assetId', i) as string;
						}

						if (inputType === 'videoAudio' || inputType === 'videoVoiceText') {
							requestBody.video_assetId = this.getNodeParameter('video_assetId', i) as string;
						}

						if (inputType === 'imageAudio' || inputType === 'videoAudio') {
							requestBody.audio_assetId = this.getNodeParameter('audio_assetId', i) as string;
						}

						if (inputType === 'imageVoiceText' || inputType === 'videoVoiceText') {
							requestBody.voiceId = this.getNodeParameter('voiceId', i) as string;
							requestBody.voice_text = this.getNodeParameter('voice_text', i) as string;
							requestBody.model_id = this.getNodeParameter('model_id', i) as string;
						}

						// Get additional options
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
							exploreMode?: boolean;
							replyUrl?: string;
							replyRef?: string;
							maxJobs?: number;
						};

						// Add additional options if provided
						if (additionalOptions.exploreMode) requestBody.exploreMode = true;
						if (additionalOptions.replyUrl) requestBody.replyUrl = additionalOptions.replyUrl;
						if (additionalOptions.replyRef) requestBody.replyRef = additionalOptions.replyRef;
						if (additionalOptions.maxJobs) requestBody.maxJobs = additionalOptions.maxJobs;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make the API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V1}/runwayml/lipsync/create`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body: requestBody,
							json: true,
						});
					} else if (operation === 'videoToVideo') {
						// Get required parameters
						const assetId = this.getNodeParameter('assetId', i) as string;
						const textPrompt = this.getNodeParameter('text_prompt', i) as string;
						const aspectRatio = this.getNodeParameter('aspect_ratio', i) as string;
						const structureTransformation = this.getNodeParameter('structure_transformation', i) as number;
						const seconds = this.getNodeParameter('seconds', i) as number;

						// Get additional options
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
							seed?: number;
							exploreMode?: boolean;
							replyUrl?: string;
							replyRef?: string;
							maxJobs?: number;
						};

						// Build request body
						const requestBody: {[key: string]: any} = {
							assetId: assetId,
							text_prompt: textPrompt,
							aspect_ratio: aspectRatio,
							structure_transformation: structureTransformation,
							seconds: seconds
						};

						// Add additional options if provided
						if (additionalOptions.seed) requestBody.seed = additionalOptions.seed;
						if (additionalOptions.exploreMode) requestBody.exploreMode = true;
						if (additionalOptions.replyUrl) requestBody.replyUrl = additionalOptions.replyUrl;
						if (additionalOptions.replyRef) requestBody.replyRef = additionalOptions.replyRef;
						if (additionalOptions.maxJobs) requestBody.maxJobs = additionalOptions.maxJobs;

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const token = credentials.apiKey as string;

						// Make the API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V1}/runwayml/gen3turbo/video`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body: requestBody,
							json: true,
						});
					} else if (operation === 'createAccount') {
						// Check confirmation
						const confirmRegistration = this.getNodeParameter('confirmRegistration', i) as boolean;

						if (!confirmRegistration) {
							throw new NodeOperationError(this.getNode(), 'Operation cancelled: Please confirm the registration by checking the confirmation checkbox.', { itemIndex: i });
						}

						// Get credentials
						const credentials = await this.getCredentials('useApiApi');
						const apiToken = credentials.apiKey as string;
						const runwayEmail = credentials.runwayEmail as string;
						const runwayPassword = credentials.runwayPassword as string;
						const maxJobs = 5; // Default value

						// Validate required credential fields
						if (!runwayEmail || !runwayPassword) {
							throw new NodeOperationError(this.getNode(), 'Missing required credential fields: Please ensure "Runway Email" and "Runway Password" are set in your credentials.', { itemIndex: i });
						}

						// Create request body
						const requestBody = {
							email: runwayEmail,
							password: runwayPassword,
							maxJobs: maxJobs,
						};

						// Make API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V1}/runwayml/accounts/${runwayEmail}`,
							headers: {
								'Authorization': `Bearer ${apiToken}`,
								'Content-Type': 'application/json',
							},
							body: requestBody,
							json: true,
						});
					}
				} else if (resource === 'minimax') {
					if (operation === 'getAccountInfo') {
						// Get optional parameters
						const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
							includeUsageStats?: boolean;
						};

						// Build the query string
						let queryString = '';
						if (additionalFields.includeUsageStats) queryString += '?includeUsageStats=true';

						// Construct URL
						const fullUrl = `${BASE_URL_V1}/minimax/account${queryString}`;

						// Get credentials
						const credentials = await this.getCredentials('useApiMinimax');
						const token = credentials.apiKey as string;

						// Make request
						responseData = await this.helpers.request({
							method: 'GET',
							url: fullUrl,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'createVideo') {
						// Get input type
						const inputType = this.getNodeParameter('inputType', i) as string;

						// Build request body
						const requestBody: {[key: string]: any} = {};

						// Add text prompt (optional but commonly used)
						const prompt = this.getNodeParameter('prompt', i, '') as string;
						if (prompt) requestBody.prompt = prompt;

						// Add image fileID if using image input
						if (inputType === 'imageText') {
							requestBody.fileID = this.getNodeParameter('fileID', i) as string;
						}

						// Add model selection
						requestBody.model = this.getNodeParameter('model', i) as string;

						// Get additional options
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
							account?: string;
							promptOptimization?: boolean;
							replyUrl?: string;
							replyRef?: string;
							maxJobs?: number;
						};

						// Add additional options if provided
						if (additionalOptions.account) requestBody.account = additionalOptions.account;
						if (additionalOptions.promptOptimization !== undefined) requestBody.promptOptimization = additionalOptions.promptOptimization;
						if (additionalOptions.replyUrl) requestBody.replyUrl = additionalOptions.replyUrl;
						if (additionalOptions.replyRef) requestBody.replyRef = additionalOptions.replyRef;
						if (additionalOptions.maxJobs) requestBody.maxJobs = additionalOptions.maxJobs;

						// Get credentials
						const credentials = await this.getCredentials('useApiMinimax');
						const token = credentials.apiKey as string;

						// Make the API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V1}/minimax/videos/create`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body: requestBody,
							json: true,
						});
					} else if (operation === 'createAccount') {
						// Check confirmation
						const confirmRegistration = this.getNodeParameter('confirmRegistration', i) as boolean;

						if (!confirmRegistration) {
							throw new NodeOperationError(this.getNode(), 'Operation cancelled: Please confirm the registration by checking the confirmation checkbox.', { itemIndex: i });
						}

						// Get credentials
						const credentials = await this.getCredentials('useApiMinimax');
						const apiToken = credentials.apiKey as string;
						const minimaxAccount = credentials.minimaxAccount as string;
						const minimaxUrl = credentials.minimaxUrl as string;
						const minimaxToken = credentials.minimaxToken as string;
						const maxJobs = credentials.maxJobs as number || 1;

						// Validate required credential fields
						if (!minimaxAccount || !minimaxToken) {
							throw new NodeOperationError(this.getNode(), 'Missing required credential fields: Please ensure "Account Name" and "Minimax API Token" are set in your credentials.', { itemIndex: i });
						}

						// Create request body
						const requestBody = {
							account: minimaxAccount,
							url: minimaxUrl || '',
							token: minimaxToken,
							maxJobs: maxJobs,
						};

						// Make API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V1}/minimax/accounts/${minimaxAccount}`,
							headers: {
								'Authorization': `Bearer ${apiToken}`,
								'Content-Type': 'application/json',
							},
							body: requestBody,
							json: true,
						});
					} else if (operation === 'retrieveVideo') {
						// Get the video ID
						const videoId = this.getNodeParameter('videoId', i) as string;

						// Get credentials
						const credentials = await this.getCredentials('useApiMinimax');
						const token = credentials.apiKey as string;

						// Make API request
						responseData = await this.helpers.request({
							method: 'GET',
							url: `${BASE_URL_V1}/minimax/videos/${videoId}`,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'uploadFile') {
						// Get account parameter (optional)
						const account = this.getNodeParameter('account', i, '') as string;

						// Get input type
						const inputType = this.getNodeParameter('inputType', i) as string;

						// Get credentials
						const credentials = await this.getCredentials('useApiMinimax');
						const token = credentials.apiKey as string;

						// Build URL with optional account parameter
						let url = `${BASE_URL_V1}/minimax/files/`;
						if (account) {
							url += `?account=${encodeURIComponent(account)}`;
						}

						let binaryData;
						let contentType;

						if (inputType === 'binaryData') {
							// Get binary data from the specified property
							const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;

							if (!items[i].binary) {
								throw new NodeApiError(this.getNode(), { message: 'No binary data found' });
							}

							const binary = items[i].binary!;

							if (!(binaryPropertyName in binary)) {
								throw new NodeApiError(this.getNode(), { message: `No binary data found in property "${binaryPropertyName}"` });
							}

							const binaryProperty = binary[binaryPropertyName];
							binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
							contentType = binaryProperty.mimeType;

							// Make sure content type is acceptable for Minimax
							if (!contentType.startsWith('image/')) {
								throw new NodeApiError(this.getNode(), { message: `Invalid content type: ${contentType}. Only image files are supported.` });
							}
						} else if (inputType === 'url') {
							// Download file from URL
							const imageUrl = this.getNodeParameter('url', i) as string;

							// Download the file
							const response = await this.helpers.request({
								method: 'GET',
								url: imageUrl,
								encoding: null, // Get the response as a Buffer
							});

							binaryData = response;

							// Try to determine content type from URL extension
							const fileExtension = imageUrl.split('.').pop()?.toLowerCase();

							if (fileExtension === 'png') {
								contentType = 'image/png';
							} else if (['jpg', 'jpeg'].includes(fileExtension || '')) {
								contentType = 'image/jpeg';
							} else if (fileExtension === 'webp') {
								contentType = 'image/jpeg'; // Use JPEG content type for webp as per docs
							} else {
								// Default to JPEG if can't determine
								contentType = 'image/jpeg';
							}
						}

						// Make the API request to upload the file
						responseData = await this.helpers.request({
							method: 'POST',
							url: url,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': contentType,
							},
							body: binaryData,
							json: true,
						});
					} else if (operation === 'listFiles') {
						// Get parameters
						const account = this.getNodeParameter('account', i, '') as string;
						const limit = this.getNodeParameter('limit', i, 10) as number;

						// Get credentials
						const credentials = await this.getCredentials('useApiMinimax');
						const token = credentials.apiKey as string;

						// Build URL with parameters
						let url = `${BASE_URL_V1}/minimax/files/?limit=${limit}`;
						if (account) {
							url += `&account=${encodeURIComponent(account)}`;
						}

						// Make API request
						responseData = await this.helpers.request({
							method: 'GET',
							url: url,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});

						// Filter results if specified
						if (responseData && Array.isArray(responseData)) {
							const filterType = this.getNodeParameter('filterType', i, 'none') as string;
							if (filterType !== 'none') {
								const filterValue = this.getNodeParameter('filterValue', i, '') as string;
								if (filterValue) {
									responseData = responseData.filter(file => {
										// Special handling for file_id since API might use a different property name
										if (filterType === 'file_id') {
											// Try different possible property names for file ID
											return String(file.file_id) === filterValue ||
												   String(file.fileId) === filterValue ||
												   String(file.id) === filterValue;
										}

										// For other fields, continue with the existing approach
										return String(file[filterType]) === filterValue ||
											   String(file[filterType])?.toLowerCase().includes(filterValue.toLowerCase());
									});
								}
							}
						}
					} else if (operation === 'listImages') {
						try {
							// Get parameters
							const limit = this.getNodeParameter('limit', i, 10) as number;
							
							// Log for debugging
							console.log(`DEBUG: Listing images, limit: ${limit}`);
							
							// Construct URL
							const url = `${BASE_URL_V1}/minimax/images/?limit=${limit}`;
							console.log(`DEBUG: Using URL: ${url}`);
							
							// Get credentials
							const credentials = await this.getCredentials('useApiMinimax');
							const token = credentials.apiKey as string;
							console.log(`DEBUG: Token available: ${token ? 'Yes (not shown for security)' : 'No'}`);

							// Make API request with detailed error handling
							try {
								responseData = await this.helpers.request({
									method: 'GET',
									url: url,
									headers: {
										'Authorization': `Bearer ${token}`,
									},
									json: true,
								});
								console.log(`DEBUG: Response received:`, responseData);
								
								// Filter results if specified
								if (responseData && Array.isArray(responseData)) {
									const filterType = this.getNodeParameter('filterType', i, 'none') as string;
									if (filterType !== 'none') {
										const filterValue = this.getNodeParameter('filterValue', i, '') as string;
										if (filterValue) {
											responseData = responseData.filter(image => {
												if (filterType === 'id') {
													return String(image.id) === filterValue ||
														String(image.imageId) === filterValue;
												}
												
												return String(image[filterType]) === filterValue ||
													String(image[filterType])?.toLowerCase().includes(filterValue.toLowerCase());
											});
										}
									}
								}
							} catch (requestError) {
								console.error(`DEBUG: API request error:`, requestError.message);
								if (requestError.response) {
									console.error(`DEBUG: Status code:`, requestError.response.statusCode);
									console.error(`DEBUG: Response body:`, requestError.response.body);
								}
								throw requestError;
							}
						} catch (error) {
							console.error(`DEBUG: Operation error:`, error.message);
							if (this.continueOnFail()) {
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({
										error: error.message,
										details: error.response?.body || "No additional details",
										status: error.response?.statusCode,
										statusText: error.response?.statusText
									}),
									{ itemData: { item: i } },
								);
								returnData.push(...executionData);
								continue;
							}
							throw error;
						}
					} else if (operation === 'listVideos') {
						try {
							// Get parameters
							const limit = this.getNodeParameter('limit', i, 10) as number;
							
							// Log for debugging
							console.log(`DEBUG: Listing videos, limit: ${limit}`);
							
							// Construct URL
							const url = `${BASE_URL_V1}/minimax/videos/?limit=${limit}`;
							console.log(`DEBUG: Using URL: ${url}`);
							
							// Get credentials
							const credentials = await this.getCredentials('useApiMinimax');
							const token = credentials.apiKey as string;
							console.log(`DEBUG: Token available: ${token ? 'Yes (not shown for security)' : 'No'}`);

							// Make API request with detailed error handling
							try {
								responseData = await this.helpers.request({
									method: 'GET',
									url: url,
									headers: {
										'Authorization': `Bearer ${token}`,
									},
									json: true,
								});
								console.log(`DEBUG: Response received:`, responseData);
								
								// Filter results if specified
								if (responseData && Array.isArray(responseData)) {
									const filterType = this.getNodeParameter('filterType', i, 'none') as string;
									if (filterType !== 'none') {
										const filterValue = this.getNodeParameter('filterValue', i, '') as string;
										if (filterValue) {
											responseData = responseData.filter(video => {
												if (filterType === 'id') {
													return String(video.id) === filterValue ||
														String(video.videoId) === filterValue;
												}
												
												return String(video[filterType]) === filterValue ||
													String(video[filterType])?.toLowerCase().includes(filterValue.toLowerCase());
											});
										}
									}
								}
							} catch (requestError) {
								console.error(`DEBUG: API request error:`, requestError.message);
								if (requestError.response) {
									console.error(`DEBUG: Status code:`, requestError.response.statusCode);
									console.error(`DEBUG: Response body:`, requestError.response.body);
								}
								throw requestError;
							}
						} catch (error) {
							console.error(`DEBUG: Operation error:`, error.message);
							if (this.continueOnFail()) {
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({
										error: error.message,
										details: error.response?.body || "No additional details",
										status: error.response?.statusCode,
										statusText: error.response?.statusText
									}),
									{ itemData: { item: i } },
								);
								returnData.push(...executionData);
								continue;
							}
							throw error;
						}
					} else if (operation === IMAGES_CREATE_OPERATION) {
						try {
							// Get required parameters
							const prompt = this.getNodeParameter('prompt', i) as string;
							console.log(`DEBUG: Using prompt: ${prompt}`);
							
							// Build request body
							const requestBody: {[key: string]: any} = {
								prompt: prompt,
							};
							
							// Get additional options
							const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
								promptOptimization?: boolean;
								model?: string;
								aspectRatio?: string;
								quantity?: number;
								replyUrl?: string;
								replyRef?: string;
							};
							
							// Add additional options if provided
							if (additionalOptions.promptOptimization !== undefined) requestBody.promptOptimization = additionalOptions.promptOptimization;
							if (additionalOptions.model) requestBody.model = additionalOptions.model;
							if (additionalOptions.aspectRatio) requestBody.aspectRatio = additionalOptions.aspectRatio;
							if (additionalOptions.quantity) requestBody.quantity = additionalOptions.quantity;
							if (additionalOptions.replyUrl) requestBody.replyUrl = additionalOptions.replyUrl;
							if (additionalOptions.replyRef) requestBody.replyRef = additionalOptions.replyRef;
							
							console.log(`DEBUG: Request body:`, requestBody);
							
							// Construct URL
							const url = `${BASE_URL_V1}/minimax/images/create`;
							console.log(`DEBUG: Using URL: ${url}`);
							
							// Get credentials
							const credentials = await this.getCredentials('useApiMinimax');
							const token = credentials.apiKey as string;
							console.log(`DEBUG: Token available: ${token ? 'Yes (not shown for security)' : 'No'}`);
							
							// Make the API request with detailed error handling
							try {
								responseData = await this.helpers.request({
									method: 'POST',
									url: url,
									headers: {
										'Authorization': `Bearer ${token}`,
										'Content-Type': 'application/json',
									},
									body: requestBody,
									json: true,
								});
								console.log(`DEBUG: Response received:`, responseData);
							} catch (requestError) {
								console.error(`DEBUG: API request error:`, requestError.message);
								if (requestError.response) {
									console.error(`DEBUG: Status code:`, requestError.response.statusCode);
									console.error(`DEBUG: Response body:`, requestError.response.body);
								}
								throw requestError;
							}
						} catch (error) {
							console.error(`DEBUG: Operation error:`, error.message);
							if (this.continueOnFail()) {
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({
										error: error.message,
										details: error.response?.body || "No additional details",
										status: error.response?.statusCode,
										statusText: error.response?.statusText
									}),
									{ itemData: { item: i } },
								);
								returnData.push(...executionData);
								continue;
							}
							throw error;
						}
					} else if (operation === IMAGES_RETRIEVE_OPERATION) {
						try {
							// Get the image ID
							const imageId = this.getNodeParameter('imageId', i) as string;
							
							// Log for debugging
							console.log(`DEBUG: Retrieving image with ID: ${imageId}`);
							
							// Construct URL
							const url = `${BASE_URL_V1}/minimax/images/${imageId}`;
							console.log(`DEBUG: Using URL: ${url}`);
							
							// Get credentials
							const credentials = await this.getCredentials('useApiMinimax');
							const token = credentials.apiKey as string;
							console.log(`DEBUG: Token available: ${token ? 'Yes (not shown for security)' : 'No'}`);

							// Make API request with detailed error handling
							try {
								responseData = await this.helpers.request({
									method: 'GET',
									url: url,
									headers: {
										'Authorization': `Bearer ${token}`,
									},
									json: true,
								});
								console.log(`DEBUG: Response received:`, responseData);
							} catch (requestError) {
								console.error(`DEBUG: API request error:`, requestError.message);
								if (requestError.response) {
									console.error(`DEBUG: Status code:`, requestError.response.statusCode);
									console.error(`DEBUG: Response body:`, requestError.response.body);
								}
								throw requestError;
							}
						} catch (error) {
							console.error(`DEBUG: Operation error:`, error.message);
							if (this.continueOnFail()) {
								const executionData = this.helpers.constructExecutionMetaData(
									this.helpers.returnJsonArray({
										error: error.message,
										details: error.response?.body || "No additional details",
										status: error.response?.statusCode,
										statusText: error.response?.statusText
									}),
									{ itemData: { item: i } },
								);
								returnData.push(...executionData);
								continue;
							}
							throw error;
						}
					}
				} else if (resource === 'midjourney') {
					// *********************************************************************
					//                            midjourney
					// *********************************************************************

					if (operation === 'imagine') {
						// Get parameters
						const prompt = this.getNodeParameter('prompt', i) as string;
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
							aspectRatio?: string;
							maxJobs?: number;
							replyUrl?: string;
							replyRef?: string;
							discord?: string;
							server?: string;
							channel?: string;
						};

						// Get credentials
						const credentials = await this.getCredentials('useApiMidjourney');
						const token = credentials.apiKey as string;

						// Process prompt with aspect ratio if provided
						let finalPrompt = prompt;
						if (additionalOptions.aspectRatio) {
							finalPrompt = `${prompt} --ar ${additionalOptions.aspectRatio}`;
						}

						// Prepare request body
						const body: {
							prompt: string;
							discord?: string;
							server?: string;
							channel?: string;
							maxJobs?: number;
							replyUrl?: string;
							replyRef?: string;
						} = {
							prompt: finalPrompt,
						};

						// Add optional parameters if provided
						if (additionalOptions.maxJobs) {
							body.maxJobs = additionalOptions.maxJobs;
						} else if (credentials.maxJobs) {
							body.maxJobs = credentials.maxJobs as number;
						}

						if (additionalOptions.replyUrl) {
							body.replyUrl = additionalOptions.replyUrl;
						}

						if (additionalOptions.replyRef) {
							body.replyRef = additionalOptions.replyRef;
						}

						// Add Discord credentials (with overrides if provided)
						if (additionalOptions.discord) {
							body.discord = additionalOptions.discord;
						} else if (credentials.discordToken) {
							body.discord = credentials.discordToken as string;
						}

						if (additionalOptions.server) {
							body.server = additionalOptions.server;
						} else if (credentials.discordServer) {
							body.server = credentials.discordServer as string;
						}

						if (additionalOptions.channel) {
							body.channel = additionalOptions.channel;
						} else if (credentials.discordChannel) {
							body.channel = credentials.discordChannel as string;
						}

						// Make API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V2}/jobs/imagine`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						});
					} else if (operation === 'getJob') {
						// Get the job ID
						const jobId = this.getNodeParameter('jobId', i) as string;

						// Get credentials
						const credentials = await this.getCredentials('useApiMidjourney');
						const token = credentials.apiKey as string;

						// Make API request
						responseData = await this.helpers.request({
							method: 'GET',
							url: `${BASE_URL_V2}/jobs/?jobid=${jobId}`,
							headers: {
								'Authorization': `Bearer ${token}`,
							},
							json: true,
						});
					} else if (operation === 'button') {
						// Get parameters
						const jobId = this.getNodeParameter('jobId', i) as string;
						const button = this.getNodeParameter('button', i) as string;
						const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
							prompt?: string;
							replyUrl?: string;
							replyRef?: string;
							maxJobs?: number;
							discord?: string;
						};

						// Get credentials
						const credentials = await this.getCredentials('useApiMidjourney');
						const token = credentials.apiKey as string;

						// Prepare request body
						const body: {
							jobid: string;
							button: string;
							prompt?: string;
							discord?: string;
							maxJobs?: number;
							replyUrl?: string;
							replyRef?: string;
						} = {
							jobid: jobId,
							button: button,
						};

						// Add optional parameters if provided
						if (additionalOptions.prompt) {
							body.prompt = additionalOptions.prompt;
						}

						if (additionalOptions.maxJobs) {
							body.maxJobs = additionalOptions.maxJobs;
						} else if (credentials.maxJobs) {
							body.maxJobs = credentials.maxJobs as number;
						}

						if (additionalOptions.replyUrl) {
							body.replyUrl = additionalOptions.replyUrl;
						}

						if (additionalOptions.replyRef) {
							body.replyRef = additionalOptions.replyRef;
						}

						// Add Discord token if provided
						if (additionalOptions.discord) {
							body.discord = additionalOptions.discord;
						} else if (credentials.discordToken) {
							body.discord = credentials.discordToken as string;
						}

						// Make API request
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${BASE_URL_V2}/jobs/button`,
							headers: {
								'Authorization': `Bearer ${token}`,
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						});
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData || { error: "Failed to get data from API" }),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				// console.error('Error in execution:', error);
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({
							error: error.message,
							details: error.response?.data || "No additional details",
							status: error.response?.status,
							statusText: error.response?.statusText
						}),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
