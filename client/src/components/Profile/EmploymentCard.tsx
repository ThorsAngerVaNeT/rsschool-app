import React, { ChangeEvent, useMemo, useState } from 'react';
import { Typography, List, Input, Button, Checkbox } from 'antd';
import { ReadOutlined, FileAddOutlined, DeleteOutlined } from '@ant-design/icons';
import isEqual from 'lodash/isEqual';
import CommonCardWithSettingsModal from './CommonCardWithSettingsModal';
import { EmploymentRecordDto, UpdateProfileInfoDto } from 'api';
import type { CheckboxChangeEvent } from 'antd/lib/checkbox';

const { Text } = Typography;

type Props = {
  data: EmploymentRecordDto[];
  isEditingModeEnabled: boolean;
  updateProfile: (data: UpdateProfileInfoDto) => Promise<boolean>;
};

// type InputField = {
//     label: string;
//     value: string;
//     type: string;
//     onChange: (event: ChangeEvent<HTMLInputElement>) => void;
// }

// type CheckboxField = {
//     label: string;
//     value: boolean;
//     type: string;
//     onChange: (event: CheckboxChangeEvent) => void;
// }

// type Field = InputField | CheckboxField;
type InputOnChange = (event: ChangeEvent<HTMLInputElement>) => void;

type CheckboxOnChange = (event: CheckboxChangeEvent) => void;

type FieldBasic = {
  label: string;
};

type InputField = FieldBasic & {
  value: string;
  onChange: InputOnChange;
};

type CheckboxField = FieldBasic & {
  value: boolean;
  onChange: CheckboxOnChange;
};

type Field = InputField | CheckboxField;

const hasEmptyFields = (employments: EmploymentRecordDto[]) =>
  employments.some(
    ({ title, dateFrom, dateTo, toPresent, companyName, officeLocation }) =>
      !title || !dateFrom || !companyName || !officeLocation || !(toPresent || dateTo),
  );

const EmploymentCard = ({ isEditingModeEnabled, data, updateProfile }: Props) => {
  const [displayEmployments, setDisplayEmployments] = useState<EmploymentRecordDto[]>(data);
  const [employments, setEmployments] = useState<EmploymentRecordDto[]>(displayEmployments);
  const isAddDisabled = useMemo(() => !!employments.length && hasEmptyFields(employments), [employments]);
  const isSaveDisabled = useMemo(
    () => isEqual(displayEmployments, employments) || hasEmptyFields(employments),
    [displayEmployments, employments],
  );

  const handleChange = (
    e: ChangeEvent<HTMLInputElement> | CheckboxChangeEvent,
    field: keyof EmploymentRecordDto,
    index: number,
  ) => {
    const { value } = e.target;

    setEmployments(prev => {
      const employment = prev[index];
      employment[field] = value;
      return [...prev];
    });
  };

  const handleSave = async () => {
    const employmentHistory = employments;
    const isUpdated = await updateProfile({ employmentHistory });

    if (!isUpdated) {
      return;
    }

    setDisplayEmployments(employments);
  };

  const handleCancel = () => {
    setEmployments(displayEmployments);
  };

  const addEmployment = () => {
    const emptyEmployment = {
      title: '',
      dateFrom: '',
      dateTo: '',
      toPresent: false,
      companyName: '',
      officeLocation: '',
    };

    setEmployments(prev => [...prev, emptyEmployment]);
  };

  const handleDelete = (index: number) => {
    setEmployments(prev => prev.filter((_, i) => i !== index));
  };

  const renderSettingsItemByType = ({ label, value, onChange }: Field) => {
    if (onChange === undefined) {
      return;
    }
    if (typeof value === 'boolean') {
      return <Checkbox onChange={onChange}>{label}</Checkbox>;
    }
    return <Input value={value} style={{ width: '100%' }} onChange={onChange} />;
  };

  const renderSettingsItem = (
    { title, dateFrom, dateTo, toPresent, companyName, officeLocation }: EmploymentRecordDto,
    index: number,
  ) => {
    const fields: Field[] = [
      {
        label: 'Position title:',
        value: title ?? '',
        onChange: (event: ChangeEvent<HTMLInputElement>) => handleChange(event, 'title', index),
      },
      {
        label: 'Company name:',
        value: companyName ?? '',
        onChange: (event: ChangeEvent<HTMLInputElement>) => handleChange(event, 'companyName', index),
      },
      {
        label: 'I am currently working in this role:',
        value: toPresent ?? '',
        onChange: (event: CheckboxChangeEvent) => handleChange(event, 'toPresent', index),
      },
      {
        label: 'Date from:',
        value: dateFrom ?? '',
        onChange: (event: ChangeEvent<HTMLInputElement>) => handleChange(event, 'dateFrom', index),
      },
      {
        label: 'Date to:',
        value: dateTo ?? '',
        onChange: (event: ChangeEvent<HTMLInputElement>) => handleChange(event, 'dateTo', index),
      },
      {
        label: 'Office location:',
        value: officeLocation ?? '',
        onChange: (event: ChangeEvent<HTMLInputElement>) => handleChange(event, 'officeLocation', index),
      },
    ];

    return (
      <List.Item>
        <div style={{ width: '100%' }}>
          <p style={{ marginBottom: 5 }}>
            {title && dateFrom && (dateTo || toPresent) && companyName && officeLocation ? (
              <>
                <Text strong>{title}</Text> at {companyName} <br />
                {`${dateFrom} - ${toPresent ? dateTo : 'Present'}`}
              </>
            ) : (
              '(Empty)'
            )}
          </p>
          <p style={{ marginBottom: 10 }}>
            <Button size="small" type="dashed" onClick={() => handleDelete(index)}>
              <DeleteOutlined /> Delete
            </Button>
          </p>
          {fields.map(({ label, value, onChange }, id) => (
            <label key={id} style={{ fontSize: 18, marginBottom: 10, display: 'block' }}>
              <Text style={{ fontSize: 18, marginBottom: 5, display: 'block' }} strong>
                {label}
              </Text>
              {renderSettingsItemByType({ label, value, onChange })}
            </label>
          ))}
        </div>
      </List.Item>
    );
  };

  const renderContentItem = ({
    title,
    dateFrom,
    dateTo,
    toPresent,
    companyName,
    officeLocation,
  }: EmploymentRecordDto) => (
    <List.Item>
      <p>
        {title && dateFrom && (dateTo || toPresent) && companyName && officeLocation ? (
          <>
            <Text strong>
              {title} at {companyName}
            </Text>
            <br />
            {`${dateFrom} - ${toPresent ? dateTo : 'Present'}`}
          </>
        ) : (
          '(Empty)'
        )}
      </p>
    </List.Item>
  );

  return (
    <CommonCardWithSettingsModal
      title="Employment"
      icon={<ReadOutlined />}
      noDataDescription="Employment history isn't filled in"
      isEditingModeEnabled={isEditingModeEnabled}
      saveProfile={handleSave}
      cancelChanges={handleCancel}
      isSaveDisabled={isSaveDisabled}
      content={
        displayEmployments.length ? (
          <List itemLayout="horizontal" dataSource={displayEmployments} renderItem={renderContentItem} />
        ) : null
      }
      profileSettingsContent={
        <>
          <List itemLayout="horizontal" dataSource={employments} renderItem={renderSettingsItem} />
          <Button type="dashed" style={{ width: '100%' }} onClick={addEmployment} disabled={isAddDisabled}>
            <FileAddOutlined /> Add new employment
          </Button>
        </>
      }
    />
  );
};

export default EmploymentCard;
