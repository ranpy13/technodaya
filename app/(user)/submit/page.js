'use client'
import { useEffect, useState } from 'react'
import FormFC from '@/components/form/form-fc'
import PreviewFC from '@/components/form/preview-fc'
import PrevIcon from '@/components/icons/navigate-before-icon'
import NextIcon from '@/components/icons/navigate-next-icon'
import { storage, db } from '@/firebasse.config'
import { arrayUnion, collection, doc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import Alert from '@/components/alert'
import { Categories } from '@/helpers/helpers'
import { useUser } from '@/contexts/user'

const SubmitFC = () => {
  const [category, setCategory] = useState(0);
  const [categoryFormData, setCategoryFormData] = useState({});
  const [activityTitle, setActivityTitle] = useState('');
  const [images, setImages] = useState([]);
  const [imgCaption, setImgCaption] = useState('');
  const [formView, setFormView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('info');

  const { user } = useUser();

  const handleSubmit = (desc) => {
    if (!user) {
      setAlertMessage('Please login to submit');
      setAlertSeverity('error');
      return;
    }

    setLoading(true);
    setAlertMessage('');
    setAlertSeverity('info');
    const heading = activityTitle
    const { date, eventBrochure } = categoryFormData
    const category_Id = category;
    const { uid: userId, displayName: userName } = user;
    let caption = imgCaption
    let brochureUrl = ''

    const uploadOnFirestore = async () => {
      const currentTime = new Date().getTime()
      const uploadObj = {
        created: new Date(currentTime).toLocaleString('en-IN', { dateStyle: "medium", timeStyle: "short", }),
        createdInSeconds: currentTime,
        author: userName,
        uid: userId,
        categoryId: category_Id,
        title: heading,
        desc: desc,
        eventDate: date ? date : '',
        imgUrl: arrayUnion(...imgLinks),
        brochureUrl: brochureUrl,
        imgCaption: caption ? caption : '',
        approved: false
      }

      try {
        await setDoc(doc(collection(db, 'submissions')), uploadObj)
        setCategory(0);
        setAlertMessage('Submitted successfully');
        setAlertSeverity('success');
        resetForm();
      } catch (err) {
        console.error(err);
        setAlertMessage(err.message);
        setAlertSeverity('error');
      } finally {
        setLoading(false);
      }
    }

    if (category_Id === 1) {
      caption = `MoU between ${categoryFormData.insName} and ${categoryFormData.partnerInsName}`
    } else if (category_Id === 3) {
      caption = `${categoryFormData.lectureType} by ${categoryFormData.speakerName}`
    }

    if (eventBrochure) {
      const storageRef = ref(storage, `Brochure/${Categories[category_Id]}/${eventBrochure.name.split(/(\\|\/)/g).pop()}/`);
      uploadBytes(storageRef, eventBrochure).then(snapshot => getDownloadURL(snapshot.ref).then(url => {
        brochureUrl = url
        desc += ` [Download event brochure](${url})`;
      }))
        .catch(error => {
          setAlertMessage(error.message);
          setAlertSeverity('error');
          console.log(error);
        })
    }
    let imagesLen = images.length;
    const imgLinks = [];
    images.forEach((image, index) => {
      const storageRef = ref(storage, `Images/${Categories[category_Id]}/${image.name.split(/(\\|\/)/g).pop()}/`);
      uploadBytes(storageRef, image).then(snapshot => getDownloadURL(snapshot.ref).then(url => {
        imgLinks.push(url);
      }))
        .catch(error => {
          setAlertMessage(error.message);
          setAlertSeverity('error');
          console.log(error);
        })
        .then(() => {
          if (index === imagesLen - 1) uploadOnFirestore();
        })
    })
    if (imagesLen === 0) uploadOnFirestore();

    // if (eventBrochure) {
    //   const uploadTask = storage.ref(`Brochure/${Categories[category_Id]}/${eventBrochure.name.split(/(\\|\/)/g).pop()}/`).put(eventBrochure);
    //   uploadTask.on('state_changed', (snapshot) => {
    //     const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
    //     console.log(progress);
    //   },
    //     (error) => {
    //       setAlertMessage(error.message);
    //       setAlertSeverity('error');
    //       console.log(error);
    //     },
    //     () => {
    //       storage.ref(`Brochure/${Categories[category_Id]}/`).child(`${eventBrochure.name.split(/(\\|\/)/g).pop()}`).getDownloadURL().then(url => {
    //         brochureUrl = url
    //       })
    //     }
    //   )
    // }

    // images
    // let total_size = images.length;
    // const imageLinks = [];
    // for (let i = 0; i < total_size; i++) {
    //   const Image = images[i];
    //   const uploadTask = storage.ref(`Images/${Categories[category_Id]}/${Image.name.split(/(\\|\/)/g).pop()}/`).put(Image);

    //   uploadTask.on('state_changed', (snapshot) => {
    //     const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
    //     console.log(progress);
    //   }, (error) => {
    //     console.log(error)
    //   }, () => {
    //     storage.ref(`Images/${Categories[category_Id]}/`).child(`${Image.name.split(/(\\|\/)/g).pop()}`).getDownloadURL().then(url => {

    //       imageLinks.push(url);
    //       if (i === total_size - 1) {
    //         uploadOnFirestore()
    //       }
    //     })
    //   })
    // }
    // if (total_size === 0) {
    //   uploadOnFirestore()
    // }
  }

  const resetForm = () => {
    setCategoryFormData({ activityTitle: activityTitle });
    setImages([]);
    setImgCaption('');
  }

  const addPerson = (person) => {
    const personType = person["type"].toLowerCase();
    setCategoryFormData((prevData) => ({ ...prevData, [personType]: prevData[personType] ? [...prevData[personType], person] : [person] }))
  }

  const removePerson = (index, personType) => {
    const personTypeSm = personType.toLowerCase();
    setCategoryFormData(prevData => ({ ...prevData, [personTypeSm]: prevData[personTypeSm] ? prevData[personTypeSm].filter((person, i) => i !== index) : [] }))
  }

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'activityTitle') {
      setActivityTitle(value);
      return;
    }
    if (name === 'eventBrochure') {
      setCategoryFormData((prevData) => ({ ...prevData, [name]: files[0] }))
      return;
    }
    setCategoryFormData((prevData) => ({ ...prevData, [name]: value }))
  }

  useEffect(() => {
    setCategoryFormData((prevData) => ({ ...prevData, activityTitle: activityTitle }))
  }, [activityTitle])

  useEffect(() => {
    if (category === 0) setActivityTitle('');
    resetForm();
    // eslint-disable-next-line
  }, [category])

  return (
    <div className="add-blogs">
      <Alert message={alertMessage} severity={alertSeverity} />
      <div className="mobile-bg" />
      <div className="activity-form container">
        <div className="tablist-wrapper">
          <div id="tabList" className="tablist">
            <button
              onClick={(e) => { e.preventDefault(); setFormView(true); }}
              className={`tab ${formView ? "active" : ""}`}
              role="tab"
            >
              Form
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setFormView(false);
              }}
              className={`tab ${!formView ? "active" : ""}`}
              role="tab"
            >
              Preview
            </button>
          </div>

          <button
            onClick={(e) => {
              setFormView(!formView);
            }}
            className={`form-navigate${formView ? " next" : " prev"}`}
            title={`${formView ? "Next" : "Go back"}`}
          >
            {formView ? <NextIcon /> : <PrevIcon />}
          </button>
        </div>

        <div className="form-wrapper">
          <FormFC
            category={category}
            setCategory={setCategory}
            activityTitle={activityTitle}
            setActivityTitle={setActivityTitle}
            categoryFormData={categoryFormData}
            handleInputChange={handleInputChange}
            addPerson={addPerson}
            removePerson={removePerson}
            images={images}
            setImages={setImages}
            imgCaption={imgCaption}
            setImgCaption={setImgCaption}
            display={formView ? "block" : "none"}
          />
          <PreviewFC
            category={category}
            title={activityTitle}
            fields={categoryFormData}
            images={images}
            imgCaption={imgCaption}
            submit={handleSubmit}
            switchForm={() => { setFormView(true) }}
            display={formView ? "none" : "block"}
            loading={loading}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              setFormView(!formView);
            }}
            className={`form-navigate${formView ? " next" : " prev"}`}
            title={`${formView ? "Next" : "Go back"}`}
          >
            {formView ? <NextIcon /> : <PrevIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmitFC;