import { Col, Form, Row, Table, message } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { CourseScheduleItemDto } from 'api';
import { GithubUserLink } from 'components/GithubUserLink';
import {
  coloredDateRenderer,
  dateSorter,
  getColumnSearchProps,
  renderTask,
  scoreRenderer,
  weightRenderer,
} from 'components/Table';
import FilteredTags from 'modules/Schedule/components/FilteredTags';
import {
  ALL_TAB_KEY,
  ColumnKey,
  ColumnName,
  CONFIGURABLE_COLUMNS,
  LocalStorageKeys,
  REVERSE_TAG_NAME_MAP,
  SCHEDULE_STATUSES,
  TAG_NAME_MAP,
  TAGS,
} from 'modules/Schedule/constants';
import { ScheduleSettings } from 'modules/Schedule/hooks/useScheduleSettings';
import { useMemo, useState, useEffect } from 'react';
import { useLocalStorage } from 'react-use';
import dayjs from 'dayjs';
import { statusRenderer, renderTagWithStyle, renderStatusWithStyle } from './renderers';
import { FilterValue } from 'antd/lib/table/interface';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { capitalize } from 'lodash';

dayjs.extend(utc);
dayjs.extend(timezone);

const getColumns = ({
  timezone,
  tagColors,
  combinedFilter,
  filteredInfo,
  currentTabKey,
}: {
  combinedFilter: CombinedFilter;
  timezone: string;
  tagColors: Record<string, string>;
  filteredInfo: Record<string, FilterValue | null>;
  currentTabKey: string;
}): ColumnsType<CourseScheduleItemDto> => {
  const timezoneOffset = `(UTC ${dayjs().tz(timezone).format('Z')})`;
  const { types, statuses } = combinedFilter;
  return [
    {
      key: ColumnKey.Status,
      title: ColumnName.Status,
      dataIndex: 'status',
      render: statusRenderer,
      ...(currentTabKey === ALL_TAB_KEY && {
        filters: SCHEDULE_STATUSES.map(({ value }) => ({ text: renderStatusWithStyle(value), value })),
        defaultFilteredValue: statuses,
        filtered: statuses?.length > 0,
        filteredValue: statuses || null,
      }),
    },
    {
      key: ColumnKey.Name,
      title: ColumnName.Name,
      dataIndex: 'name',
      render: renderTask,
      filteredValue: filteredInfo.name || null,
      ...getColumnSearchProps('name'),
    },
    {
      key: ColumnKey.Type,
      title: ColumnName.Type,
      dataIndex: 'tag',
      render: (tag: CourseScheduleItemDto['tag']) => renderTagWithStyle(tag, tagColors),
      filters: TAGS.map(status => ({ text: renderTagWithStyle(status.value, tagColors), value: status.value })),
      defaultFilteredValue: types,
      filtered: types?.length > 0,
      filteredValue: types || null,
    },
    {
      key: ColumnKey.StartDate,
      title: (
        <span>
          {ColumnName.StartDate} {timezoneOffset}
        </span>
      ),
      dataIndex: 'startDate',
      render: coloredDateRenderer(timezone, 'YYYY-MM-DD HH:mm', 'start', 'Recommended date for studying'),
      sorter: dateSorter('startDate'),
      sortDirections: ['descend', 'ascend'],
    },
    {
      key: ColumnKey.EndDate,
      title: (
        <span>
          {ColumnName.EndDate} {timezoneOffset}
        </span>
      ),
      dataIndex: 'endDate',
      render: coloredDateRenderer(timezone, 'YYYY-MM-DD HH:mm', 'end', 'Recommended deadline'),
      sorter: dateSorter('endDate'),
      sortDirections: ['descend', 'ascend'],
    },
    {
      key: ColumnKey.Organizer,
      title: ColumnName.Organizer,
      dataIndex: ['organizer', 'githubId'],
      render: (value: string) => !!value && <GithubUserLink value={value} />,
      filteredValue: filteredInfo.organizer || null,
      ...getColumnSearchProps('organizer.githubId'),
    },
    {
      key: ColumnKey.Weight,
      title: ColumnName.Weight,
      dataIndex: ['scoreWeight'],
      render: weightRenderer,
      align: 'right',
    },
    {
      key: ColumnKey.Score,
      title: ColumnName.Score,
      render: scoreRenderer,
      align: 'right',
    },
  ];
};

export interface TableViewProps {
  settings: ScheduleSettings;
  data: CourseScheduleItemDto[];
  statusFilter?: string;
}

export interface CombinedFilter {
  types: string[];
  statuses: string[];

  filterTags?: string[];
}

const hasStatusFilter = (statusFilter?: string, itemStatus?: string) =>
  Array.isArray(statusFilter) || statusFilter === ALL_TAB_KEY || itemStatus === statusFilter;

export function TableView({ data, settings, statusFilter = ALL_TAB_KEY }: TableViewProps) {
  const [form] = Form.useForm();
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [filteredInfo, setFilteredInfo] = useState<Record<string, FilterValue | string[] | null>>({});
  const [combinedFilter = { types: [], statuses: [] }, setCombinedFilter] = useLocalStorage<CombinedFilter>(
    LocalStorageKeys.Filters,
  );

  useEffect(() => {
    if (statusFilter !== ALL_TAB_KEY && combinedFilter.statuses.length) {
      setCombinedFilter({ ...combinedFilter, statuses: [] });
      setTagFilters(tagFilters.filter(filter => !filter.toLowerCase().startsWith(ColumnKey.Status)));
    }
  }, [statusFilter]);

  const filteredData = useMemo(() => {
    return data
      .filter(item => (hasStatusFilter(statusFilter, item.status) ? item : null))
      .filter(
        item =>
          (combinedFilter.types.length ? combinedFilter.types.includes(item.tag) : true) &&
          (combinedFilter.statuses.length ? combinedFilter.statuses.includes(item.status) : true),
      );
  }, [combinedFilter, data, statusFilter]);

  const filteredColumns = useMemo(
    () =>
      getColumns({
        tagColors: settings.tagColors,
        timezone: settings.timezone,
        combinedFilter,
        filteredInfo,
        currentTabKey: statusFilter,
      }).filter(column => {
        const key = (column.key as ColumnKey) ?? ColumnKey.Name;
        return CONFIGURABLE_COLUMNS.includes(key) ? !settings.columnsHidden.includes(key) : true;
      }),
    [settings.columnsHidden, settings.timezone, settings.tagColors, statusFilter, combinedFilter],
  );
  const columns = filteredColumns as ColumnsType<CourseScheduleItemDto>;

  const handleTagClose = (removedTag: string) => {
    const [removedTagName, ...removedTagValueParts] = removedTag.split(':');
    const removedTagValue = removedTagValueParts.join(':');

    switch (removedTagName) {
      case ColumnName.Type:
        {
          setCombinedFilter({
            ...combinedFilter,
            types: combinedFilter.types.filter(tag => tag !== REVERSE_TAG_NAME_MAP[removedTagValue.trim()]),
          });
        }
        break;
      case ColumnName.Status:
        {
          setCombinedFilter({
            ...combinedFilter,
            statuses: combinedFilter.statuses.filter(tag => tag !== removedTagValue.trim().toLowerCase()),
          });
        }
        break;
      default:
        message.error('An error occurred. Please try again later.');
        break;
    }
    setTagFilters(tagFilters.filter(filter => filter !== removedTag));
  };

  const handleClearAllButtonClick = () => {
    setCombinedFilter({ types: [], statuses: [] });
    setTagFilters([]);
  };

  const handleTableChange = (_: any, filters: Record<ColumnKey, FilterValue | string[] | null>) => {
    const combinedFilter: CombinedFilter = {
      types: filters.type?.map(tag => tag.toString()) ?? [],
      statuses: filters.status?.map(status => status.toString()) ?? [],
    };

    const filterTag: string[] = [
      ...combinedFilter.types.map(tag => `${ColumnName.Type}: ${TAG_NAME_MAP[tag as CourseScheduleItemDto['tag']]}`),
      ...combinedFilter.statuses.map(status => `${ColumnName.Status}: ${capitalize(status)}`),
    ];

    setTagFilters(filterTag);
    setCombinedFilter(combinedFilter);
    setFilteredInfo(filters);
  };

  const generateUniqueRowKey = ({ id, name, tag }: CourseScheduleItemDto) => [id, name, tag].join('|');

  return (
    <Row style={{ padding: '24px 0 0' }} gutter={32}>
      <Col span={24}>
        <Form form={form} component={false}>
          <FilteredTags
            tagFilters={tagFilters}
            onTagClose={handleTagClose}
            onClearAllButtonClick={handleClearAllButtonClick}
          />
          <Table
            locale={{
              // disable default tooltips on sortable columns
              triggerDesc: undefined,
              triggerAsc: undefined,
              cancelSort: undefined,
            }}
            onChange={handleTableChange}
            pagination={false}
            dataSource={filteredData}
            rowKey={generateUniqueRowKey}
            size="middle"
            columns={columns}
          />
        </Form>
      </Col>
    </Row>
  );
}

export default TableView;
