import { Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { Checkbox } from 'antd/lib';
import { EmploymentRecordDto, ProfileApi } from 'api';
import { ModalSubmitForm } from 'components/Forms/ModalSubmitForm';
import { AxiosError } from 'axios';

const { Paragraph } = Typography;
const profileApi = new ProfileApi();

const JobFoundButtonWithModal = (data: EmploymentRecordDto) => {
  const [isJobFoundModalVisible, setIsJobFoundModalVisible] = useState(false);
  const [checked, setChecked] = useState(true);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorText, setErrorText] = useState('');

  const title = `I've got a job`;

  const showJobFoundModal = () => {
    setIsJobFoundModalVisible(true);
  };

  const hideJobFoundModal = () => {
    setIsJobFoundModalVisible(false);
  };

  const onSubmit = async (values: EmploymentRecordDto) => {
    setLoading(true);
    try {
      if (!values.companyName) {
        values.companyName = '';
        values.officeLocation = '';
      }
      await profileApi.updateProfileInfoFlat({ employmentHistory: [values] });
      setSubmitted(true);
    } catch (e) {
      let error = 'Unknown error';
      if (e instanceof AxiosError) {
        error = e.response?.data?.message;
      } else if (e instanceof Error) {
        error = e.message;
      }
      setErrorText(error);
    } finally {
      setLoading(false);
    }
  };

  const onChange = (e: CheckboxChangeEvent) => {
    setChecked(e.target.checked);
  };

  const onClose = () => {
    setErrorText('');
    setLoading(false);
    setSubmitted(false);
    hideJobFoundModal();
  };

  return (
    <>
      <Paragraph style={{ textAlign: 'center', margin: 0 }}>
        <Button type="primary" style={{ marginTop: 20 }} onClick={showJobFoundModal}>
          {title}
        </Button>
      </Paragraph>
      <ModalSubmitForm
        title="Share with us if you've got a job"
        data={data}
        submit={onSubmit}
        close={onClose}
        submitted={submitted}
        errorText={errorText}
        loading={loading}
        open={isJobFoundModalVisible}
      >
        <Form.Item label="Check checkbox if you've got a job" name="jobFound" valuePropName="checked" required>
          <Checkbox onChange={onChange}>{title}</Checkbox>
        </Form.Item>
        <Form.Item label="Add a company name" name="companyName">
          <Input disabled={!checked} />
        </Form.Item>
        <Form.Item label="Add a office location" name="officeLocation">
          <Input disabled={!checked} />
        </Form.Item>
      </ModalSubmitForm>
    </>
  );
};

export default JobFoundButtonWithModal;
