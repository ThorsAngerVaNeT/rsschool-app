import {
  BranchesOutlined,
  ClockCircleTwoTone,
  CloseCircleTwoTone,
  FileExcelOutlined,
  MinusCircleOutlined,
  PlusCircleTwoTone,
  SolutionOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { Button, Drawer, message, Row, Statistic, Switch, Table, Typography } from 'antd';
import { ColumnProps } from 'antd/lib/table/Column';
import { PageLayout, CommentModal, withSession } from 'components';
import { MentorSearch } from 'components/MentorSearch';
import {
  boolIconRenderer,
  boolSorter,
  getColumnSearchProps,
  numberSorter,
  PersonCell,
  stringSorter,
} from 'components/Table';
import { useLoading } from 'components/useLoading';
import withCourseData from 'components/withCourseData';
import _ from 'lodash';
import { useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import { isCourseManager } from 'rules/user';
import { CourseService, StudentDetails } from 'services/course';
import { CoursePageProps } from 'services/models';
import css from 'styled-jsx/css';
import { MentorBasic } from '../../../../../common/models';

const { Text } = Typography;

type Stats = { activeStudentsCount: number; studentsCount: number; countries: any[] };
type Props = CoursePageProps;

function Page(props: Props) {
  const courseId = props.course.id;

  const [loading, withLoading] = useLoading(false);
  const [expelMode, setExpelMode] = useState(false);
  const [isManager] = useState(isCourseManager(props.session, props.course.id));
  const courseService = useMemo(() => new CourseService(courseId), [courseId]);
  const [students, setStudents] = useState([] as StudentDetails[]);
  const [stats, setStats] = useState(null as Stats | null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [details, setDetails] = useState<StudentDetails | null>(null);

  useAsync(withLoading(loadStudents), [activeOnly]);

  const createRepositories = withLoading(async () => {
    await courseService.createRepositories();
    message.info('The job for creating repositories has been submitted');
  });

  const issueCertificate = withLoading(async () => {
    const githubId = details?.githubId;
    if (githubId != null) {
      await courseService.createCertificate(githubId);
      message.info('The certificate has been requested.');
    }
  });

  const createRepository = withLoading(async () => {
    const githubId = details?.githubId;
    if (githubId != null) {
      const { repository } = await courseService.createRepository(githubId);
      const newStudents = students.map(s => (s.githubId === githubId ? { ...s, repository: repository } : s));
      setStudents(newStudents);
    }
  });

  const expelStudent = withLoading(async (text: string) => {
    const githubId = details?.githubId;
    if (githubId != null) {
      await courseService.expelStudent(githubId, text);
      message.info('Student has been expelled');
    }
    setExpelMode(false);
  });

  const restoreStudent = withLoading(async () => {
    const githubId = details?.githubId;
    if (githubId != null) {
      await courseService.restoreStudent(githubId);
      message.info('Student has been restored');
    }
  });

  const updateMentor = withLoading(async (mentorGithuId: string | null = null) => {
    const githubId = details?.githubId;
    if (details != null && githubId != null) {
      const student = await courseService.updateStudent(githubId, { mentorGithuId });
      setDetails({ ...details, mentor: student.mentor });
    }
  });

  return render();

  function render() {
    return (
      <PageLayout loading={loading} githubId={props.session.githubId}>
        <Statistic
          title="Active Students"
          value={stats?.activeStudentsCount ?? 0}
          suffix={`/ ${stats?.studentsCount ?? 0}`}
        />
        <Row justify="space-between" style={{ marginBottom: 16, marginTop: 16 }}>
          <div>
            <span style={{ display: 'inline-block', lineHeight: '24px' }}>Active Students Only</span>{' '}
            <Switch checked={activeOnly} onChange={() => setActiveOnly(!activeOnly)} />
          </div>
          <div>{renderToolbar()}</div>
        </Row>
        <Table
          rowKey="id"
          pagination={{ pageSize: 100 }}
          size="small"
          onRow={record => ({ onClick: () => setDetails(record) })}
          dataSource={students}
          columns={getColumns()}
        />
        <Drawer
          width={400}
          title="Student"
          placement="right"
          closable={false}
          onClose={() => {
            setDetails(null);
            loadStudents();
          }}
          visible={!!details}
        >
          <div className="student-details-actions">
            <Button disabled={!details?.isActive} icon={<BranchesOutlined />} onClick={createRepository}>
              Create Repository
            </Button>
            <Button disabled={!details?.isActive} icon={<SolutionOutlined />} onClick={issueCertificate}>
              Issue Certificate
            </Button>
            {details?.isActive ? (
              <Button icon={<CloseCircleTwoTone twoToneColor="red" />} onClick={() => setExpelMode(true)}>
                Expel
              </Button>
            ) : null}
            {!details?.isActive ? (
              <Button icon={<UndoOutlined />} onClick={restoreStudent}>
                Restore
              </Button>
            ) : null}
            <div>
              Mentor
              <MentorSearch
                allowClear
                onChange={updateMentor}
                courseId={props.course.id}
                keyField="githubId"
                value={(details?.mentor as MentorBasic)?.githubId}
                defaultValues={details?.mentor ? [details?.mentor as any] : []}
              />
            </div>
          </div>
        </Drawer>
        <CommentModal
          title="Expelling Reason"
          visible={expelMode}
          onCancel={() => setExpelMode(false)}
          onOk={expelStudent}
        />
        <style jsx>{styles}</style>
      </PageLayout>
    );
  }

  function renderToolbar() {
    return (
      <>
        {isManager ? (
          <Button icon={<BranchesOutlined />} style={{ marginRight: 8 }} onClick={createRepositories}>
            Create Repos
          </Button>
        ) : null}
        <Button icon={<FileExcelOutlined />} style={{ marginRight: 8 }} onClick={exportStudents}>
          Export CSV
        </Button>
      </>
    );
  }

  function exportStudents() {
    courseService.exportStudentsCsv(activeOnly);
  }

  async function loadStudents() {
    const courseStudents = await courseService.getCourseStudentsWithDetails(activeOnly);
    setStudents(courseStudents);
    setStats(calculateStats(courseStudents));
  }
}

function getColumns(): ColumnProps<any>[] {
  return [
    {
      title: 'Active',
      dataIndex: 'isActive',
      width: 50,
      render: boolIconRenderer,
      sorter: boolSorter('isActive'),
    },
    {
      title: 'Student',
      dataIndex: 'githubId',
      sorter: stringSorter('githubId'),
      key: 'githubId',
      render: (_, record: any) => <PersonCell value={record} />,
      ...getColumnSearchProps(['githubId', 'name']),
    },
    {
      title: 'Mentor',
      dataIndex: 'mentor',
      sorter: stringSorter<any>('mentor.githubId'),
      render: (value: any) => (value ? <PersonCell value={value} /> : null),
      ...getColumnSearchProps(['mentor.githubId', 'mentor.name']),
    },
    {
      title: 'City',
      dataIndex: 'cityName',
      width: 80,
      sorter: stringSorter('cityName'),
      ...getColumnSearchProps('cityName'),
    },
    {
      title: 'Country',
      dataIndex: 'countryName',
      key: 'countryName',
      width: 80,
      sorter: stringSorter('countryName'),
      ...getColumnSearchProps('countryName'),
    },
    {
      title: 'Screening',
      dataIndex: 'interviews',
      width: 60,
      render: (value: any[]) => {
        if (value.length === 0) {
          return <MinusCircleOutlined title="No Interview" />;
        }
        if (value.every(e => e.isCompleted)) {
          return <PlusCircleTwoTone title="Completed" twoToneColor="#52c41a" />;
        } else {
          return <ClockCircleTwoTone title="Assigned" />;
        }
      },
    },
    {
      title: <BranchesOutlined />,
      dataIndex: 'repository',
      width: 80,
      render: (value: string) => (value ? <a href={value}>Link</a> : null),
    },
    {
      title: 'Total',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 80,
      align: 'right',
      sorter: numberSorter('totalScore'),
      render: (value: number) => <Text strong>{value.toFixed(1)}</Text>,
    },
  ];
}

function calculateStats(students: StudentDetails[]) {
  let activeStudentsCount = 0;
  const countries: Record<string, { count: number; totalCount: number }> = {};

  for (const student of students) {
    const { countryName } = student;
    if (!countries[countryName]) {
      countries[countryName] = { count: 0, totalCount: 0 };
    }
    countries[countryName].totalCount++;
    if (student.isActive) {
      activeStudentsCount++;
      countries[countryName].count++;
    }
  }
  return {
    activeStudentsCount,
    studentsCount: students.length,
    countries: _.keys(countries).map(k => ({
      name: k,
      count: countries[k].count,
      totalCount: countries[k].totalCount,
    })),
  };
}

const styles = css`
  :global(.rs-table-row-disabled) {
    opacity: 0.25;
  }

  .student-details-actions :global(.ant-btn) {
    margin: 0 8px 8px 0;
  }
`;

export default withCourseData(withSession(Page));
