import { INodeProperties } from 'n8n-workflow';

export const VIDEOS_LIST_OPERATION = 'listVideos';

export const videosListFields: INodeProperties[] = [
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    typeOptions: {
      minValue: 1,
      maxValue: 100,
    },
    default: 10,
    displayOptions: {
      show: {
        resource: ['minimax'],
        operation: [VIDEOS_LIST_OPERATION],
      },
    },
    description: 'Maximum number of videos to return',
  },
  {
    displayName: 'Filter Type',
    name: 'filterType',
    type: 'options',
    options: [
      { name: 'None', value: 'none' },
      { name: 'ID', value: 'id' },
      { name: 'Status', value: 'status' },
      { name: 'Created At', value: 'created_at' }
    ],
    default: 'none',
    displayOptions: {
      show: {
        resource: ['minimax'],
        operation: [VIDEOS_LIST_OPERATION],
      },
    },
    description: 'Field to filter the results by',
  },
  {
    displayName: 'Filter Value',
    name: 'filterValue',
    type: 'string',
    default: '',
    displayOptions: {
      show: {
        resource: ['minimax'],
        operation: [VIDEOS_LIST_OPERATION],
        filterType: ['id', 'status', 'created_at'],
      },
    },
    description: 'Value to filter by',
  },
];
