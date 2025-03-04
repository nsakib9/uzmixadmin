import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  Row,
  Select,
} from 'antd';
import moment from 'moment';
import { batch, shallowEqual, useDispatch, useSelector } from 'react-redux';
import { disableRefetch, removeFromMenu, setMenuData } from 'redux/slices/menu';
import discountService from 'services/seller/discount';
import { fetchDiscounts } from 'redux/slices/discount';
import { DebounceSelect } from 'components/search';
import { useTranslation } from 'react-i18next';
import createImage from 'helpers/createImage';
import MediaUpload from 'components/upload';
import Loading from 'components/loading';
import stockService from 'services/seller/stock';
import { GetColorName } from 'hex-color-to-color-name';

export default function DiscountEdit() {
  const { t } = useTranslation();
  const { activeMenu } = useSelector((state) => state.menu, shallowEqual);
  const dispatch = useDispatch();
  const { id } = useParams();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loadingBtn, setLoadingBtn] = useState(false);
  const [loading, setLoading] = useState(false);
  const { myShop: shop } = useSelector((state) => state.myShop, shallowEqual);
  const [image, setImage] = useState(
    activeMenu.data?.images ? [activeMenu.data?.images[0]] : [],
  );

  useEffect(() => {
    return () => {
      const values = form.getFieldsValue(true);
      const start = JSON.stringify(values.start);
      const end = JSON.stringify(values.end);
      const data = { ...values, start, end };
      dispatch(setMenuData({ activeMenu, data }));
    };
  }, []);

  function fetchDiscount() {
    setLoading(true);
    discountService
      .getById(id)
      .then(({ data }) => {
        const values = {
          price: data.price,
          type: data.type,
          products: data?.stocks?.map((stock) => ({
            label: `${stock?.product?.translation?.title} => ${stock?.extras
              ?.map(
                (extra) =>
                  `${extra?.group?.translation?.title || t('N/A')}: ${
                    extra?.group?.type === 'color'
                      ? GetColorName(extra?.value?.value)
                      : extra?.value?.value || t('N/A')
                  }`,
              )
              ?.join(', ')}`,
            value: stock?.id,
            key: stock?.id,
          })),
          start: moment(data.start, 'YYYY-MM-DD'),
          end: moment(data.end, 'YYYY-MM-DD'),
          image: [createImage(data.img)],
        };
        console.log('values', values);
        form.setFieldsValue(values);
        setImage([createImage(data.img)]);
      })
      .finally(() => {
        setLoading(false);
        dispatch(disableRefetch(activeMenu));
      });
  }

  useEffect(() => {
    if (activeMenu.refetch) {
      fetchDiscount();
    }
  }, [activeMenu.refetch]);

  const onFinish = (values) => {
    const startDate = moment(values.start).format('YYYY-MM-DD');
    const endDate = moment(values.end).format('YYYY-MM-DD');
    if (startDate > endDate)
      return toast.error(t('start.date.must.be.before.end.date'));

    const body = {
      price: values.price,
      type: values.type,
      stocks: values.products.map((item) => item.value),
      start: values.start
        ? moment(values.start).format('YYYY-MM-DD')
        : undefined,
      end: values.end ? moment(values.end).format('YYYY-MM-DD') : undefined,
      images: [image[0]?.name],
    };
    setLoadingBtn(true);
    const nextUrl = 'seller/discounts';
    discountService
      .update(id, body)
      .then(() => {
        toast.success(t('successfully.updated'));
        batch(() => {
          dispatch(removeFromMenu({ ...activeMenu, nextUrl }));
          dispatch(fetchDiscounts({}));
        });
        navigate(`/${nextUrl}`);
      })
      .finally(() => setLoadingBtn(false));
  };

  async function fetchProducts(search) {
    const params = {
      search,
      shop_id: shop.id,
      status: 'published',
      active: 1,
      rest: 1,
    };
    return stockService.getAll(params).then((res) =>
      res.data.map((item) => ({
        label: `${item?.product?.translation?.title} => ${item?.extras
          ?.map(
            (extra) =>
              `${extra?.group?.translation?.title || t('N/A')}: ${
                extra?.group?.type === 'color'
                  ? GetColorName(extra?.value?.value)
                  : extra?.value?.value || t('N/A')
              }`,
          )
          ?.join(', ')}`,
        value: item.id,
        key: item.id,
      })),
    );
  }

  const getInitialValues = () => {
    const data = activeMenu.data;
    if (!activeMenu.data?.start) {
      return data;
    }
    const start = activeMenu.data.start;
    const end = activeMenu.data.end;
    return {
      ...data,
      start: moment(start, 'YYYY-MM-DD'),
      end: moment(end, 'YYYY-MM-DD'),
    };
  };

  return (
    <Card title={t('edit.discount')} className='h-100'>
      {!loading ? (
        <Form
          name='discount-add'
          layout='vertical'
          onFinish={onFinish}
          form={form}
          initialValues={{ ...getInitialValues(), ...activeMenu.data }}
          className='d-flex flex-column h-100'
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label={t('type')}
                name={'type'}
                rules={[
                  {
                    required: true,
                    message: t('required'),
                  },
                ]}
              >
                <Select>
                  <Select.Option value='fix'>{t('fix')}</Select.Option>
                  <Select.Option value='percent'>{t('percent')}</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('price')}
                name='price'
                rules={[
                  {
                    required: true,
                    message: t('required'),
                  },
                ]}
              >
                <InputNumber min={0} className='w-100' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('start.date')}
                name='start'
                rules={[
                  {
                    required: true,
                    message: t('required'),
                  },
                ]}
              >
                <DatePicker
                  className='w-100'
                  placeholder=''
                  disabledDate={(current) =>
                    moment().add(-1, 'days') >= current
                  }
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('end.date')}
                name='end'
                rules={[
                  {
                    required: true,
                    message: t('required'),
                  },
                ]}
              >
                <DatePicker
                  className='w-100'
                  placeholder=''
                  disabledDate={(current) =>
                    moment().add(-1, 'days') >= current
                  }
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label={t('products')}
                name='products'
                rules={[
                  {
                    required: true,
                    message: t('required'),
                  },
                ]}
              >
                <DebounceSelect fetchOptions={fetchProducts} mode='multiple' />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label={t('image')}
                name='images'
                rules={[
                  {
                    required: !image.length,
                    message: t('required'),
                  },
                ]}
              >
                <MediaUpload
                  type='discounts'
                  imageList={image}
                  setImageList={setImage}
                  form={form}
                  multiple={false}
                  name='image'
                />
              </Form.Item>
            </Col>
          </Row>
          <div className='flex-grow-1 d-flex flex-column justify-content-end'>
            <div className='pb-5'>
              <Button type='primary' htmlType='submit' loading={loadingBtn}>
                {t('submit')}
              </Button>
            </div>
          </div>
        </Form>
      ) : (
        <Loading />
      )}
    </Card>
  );
}
