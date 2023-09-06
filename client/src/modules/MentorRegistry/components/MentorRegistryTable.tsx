import React from 'react';
import { Form, Table } from 'antd';
import FilteredTags from 'modules/Schedule/components/FilteredTags';
import { FilterValue } from 'antd/lib/table/interface';
import { MentorRegistryDto } from 'api';
import { MentorsRegistryColumnKey, PAGINATION } from '../constants';
import { ColumnType } from 'antd/lib/table';

type Props = {
  tagFilters: string[];
  filteredData: MentorRegistryDto[];
  columns: ColumnType<MentorRegistryDto>[];
  handleTagClose: (tag: string) => void;
  handleClearAllButtonClick: () => void;
  handleTableChange: (_: any, filters: Record<MentorsRegistryColumnKey, FilterValue | string[] | null>) => void;
};

export function MentorRegistryTable(props: Props) {
  const { tagFilters, filteredData, columns, handleTagClose, handleClearAllButtonClick, handleTableChange } = props;
  const [form] = Form.useForm();

  const tableWidth = 2000;
  return (
    <Form form={form} component={false}>
      <FilteredTags
        filters={[{ tags: tagFilters, onClose: handleTagClose }]}
        onClearAllButtonClick={handleClearAllButtonClick}
      />
      <Table<MentorRegistryDto>
        pagination={{ pageSize: PAGINATION }}
        size="large"
        rowKey="id"
        dataSource={filteredData}
        scroll={{ x: tableWidth, y: 'calc(95vh - 290px)' }}
        columns={columns}
        onChange={handleTableChange}
      />
    </Form>
  );
}
